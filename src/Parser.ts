import {Token, TokenType, Associativity} from './Specs.js';
import {Registry} from './Registries.js';
import { raiseError } from "./ErrorFormat.js";


export class Parser
{
    private operatorStack: Token[] = [];
    private argCountStack: number[] = [];
    private seenArgStack: boolean[] = [];
    private expression = "";



    touchArgStartIfNeeded() 
    {
        if (this.argCountStack.length > 0 && this.seenArgStack.at(-1) === false) 
        {
            this.seenArgStack.pop();
            this.seenArgStack.push(true);

            const count: number= this.argCountStack.pop()!;
            this.argCountStack.push(count + 1);
        }

    }


    toRPN(tokens: Token[], registry: Registry, expression: string): Token[]
    {
        this.operatorStack = [];
        this.argCountStack = [];
        this.seenArgStack = [];
        this.expression = expression ?? "";
        let output: Token[] = [];
        
        let tempOpSpec;
        let tempCurrentOpSpec;

        for(let i = 0; i < tokens.length; i++)
        {
            let currentToken = tokens[i]!;

            if (currentToken.type === TokenType.Number)
            {
                //check if the next token is a parenthesis, if so, we assume multiplication is intented,
                //  so we push a multiplication operator before the number
                let nextToken = tokens[i + 1];
                if (nextToken != null && nextToken.token === "(") {
                    const tokenObj = new Token(TokenType.Operator, "*", { startIndex: (currentToken.location.startIndex ?? 0) + 1, endIndex: (currentToken.location.startIndex ?? 0) + 1 });
                    this.operatorStack.push(tokenObj);

                }

                output.push(currentToken);
                this.touchArgStartIfNeeded();
            }
            else
            if (currentToken.type === TokenType.Identifier)
            {
                let nextToken = tokens[i + 1];
                let isFunctionCall = nextToken != null
                    && nextToken.token === "("
                    && registry.isFunction(currentToken.token);

                if (isFunctionCall)
                {
                    this.operatorStack.push(currentToken);
                }
                else
                {
                    //check if the next token is a parenthesis, if so, we assume multiplication is intented,
                    //  so we push a multiplication operator before the identifier
                    if (nextToken != null && nextToken.token === "(") {
                        
                        const tokenObj = new Token(TokenType.Operator, "*", { startIndex: (currentToken.location.startIndex ?? 0) + 1, endIndex: (currentToken.location.startIndex ?? 0) + 1 });
                        this.operatorStack.push(tokenObj);

                    }

                    output.push(currentToken);
                    this.touchArgStartIfNeeded();
                }
            }
            else
            if (currentToken.type === TokenType.Comma)
            {
                
                
                
                while (this.operatorStack.length > 0 && this.operatorStack.at(-1)!.token !== "(")
                {
                    output.push(this.operatorStack.pop()!);
                }

                if (this.argCountStack.length === 0 || this.seenArgStack.length === 0) 
                {

                    raiseError("Misplaced comma, missing parenthesis", currentToken, this.expression);

                }

                if(this.seenArgStack.at(-1) === false)
                {
                    raiseError("Missing argument", currentToken, this.expression);
                }

                
                if(this.operatorStack.length == 0 || this.operatorStack.at(-1)!.token !== "(")
                {
                    raiseError("Misplaced comma, missing parenthesis", currentToken, this.expression);
                }


                //this.argCountStack.push(this.argCountStack.pop() + 1);
                this.seenArgStack.pop();
                this.seenArgStack.push(false);
           
            }
            else
            if (currentToken.type === TokenType.Operator || currentToken.type === TokenType.UnaryOperator)
            {

                while (this.operatorStack.length > 0)
                {
                    let topStack = this.operatorStack.at(-1)!;
                    
                    if (topStack.token !== "(")
                    {
                        if (registry.isOperator(topStack.token))
                        {
                            tempOpSpec = registry.getOperator(topStack.token);
                            tempCurrentOpSpec = registry.getOperator(currentToken.token);
                            
                            if (tempOpSpec == undefined || tempCurrentOpSpec == undefined)
                                raiseError("syntax error, unknown operator: " + (tempOpSpec == undefined ? topStack.token : currentToken.token),
                             tempOpSpec == undefined ? topStack : currentToken, this.expression);

                            if (tempOpSpec!.precedence > tempCurrentOpSpec!.precedence || (tempOpSpec!.precedence === tempCurrentOpSpec!.precedence
                                 && tempCurrentOpSpec!.associativity === Associativity.Left))
                            {
                                output.push(this.operatorStack.pop()!);
                                continue;
                            }

                            break;
                        }
                        else
                        {
                            break;
                        }

                    }
                    else
                        break;
                    

                }

                this.operatorStack.push(currentToken);

            }
            else
            if (currentToken.type === TokenType.Parenthesis)
            {
                if (currentToken.token === "(")
                {
                    this.operatorStack.push(currentToken);
                    
                    let startsFunction = i > 0 && tokens[i - 1]!.type === TokenType.Identifier;

                    if (startsFunction)
                    {
                        this.argCountStack.push(0);
                        this.seenArgStack.push(false);
                    }

                }
                else
                {


                    let topStack = this.operatorStack.pop();

                    while (topStack !== undefined && topStack.token !== "(")
                    {
                        output.push(topStack);
                        topStack = this.operatorStack.pop();
                    }

                    if (this.operatorStack.length>0 && registry.isFunction(this.operatorStack.at(-1)!.token))
                    {
                        topStack = this.operatorStack.pop()!;

                        if (this.argCountStack.length == 0 || this.seenArgStack.length == 0)
                            raiseError("syntax error, internal arg frame mismatch", currentToken, this.expression);
                        
                        let argCount = this.argCountStack.pop()!;
                        let seenArg = this.seenArgStack.pop()!;


                        if (!seenArg && argCount != 0)
                        {
                            //since the current token is a bit past the comma,
                            //  we need to adjust the location to point to the comma instead of the closing parenthesis
                            currentToken.location.endIndex = --currentToken.location.startIndex;
                            raiseError("Misplaced comma", currentToken, this.expression);
                        }

                        if (argCount == 0 && seenArg){
                            argCount = 1;
                        }


                        let funcSpec = registry.getFunction(topStack.token);

                        if (funcSpec==undefined)
                            raiseError("syntax error, unknown function: " + topStack.token, topStack, this.expression);

                        if (funcSpec.fixedArity)
                        {
                            if (funcSpec.arity != argCount)
                            {
                                raiseError("syntax error, function " + topStack.token + " expects " + funcSpec.arity + " arguments, got " + argCount, topStack, this.expression);
                            }

                        }
                        else
                        {
                            if (!funcSpec.overloads.has(argCount) && (funcSpec.minArity == null || argCount < funcSpec.minArity))
                            {
                                raiseError("syntax error, function " + topStack.token + " expects at least " + funcSpec.minArity + " arguments, got " + argCount, topStack, this.expression);
                            }

                            if (!Array.from(funcSpec.overloads.keys()).includes(argCount) && funcSpec.operation == null)
                            {
                                raiseError("syntax error, function " + topStack.token + " does not have an overload for " + argCount + " arguments", topStack, this.expression);
                            }

                        }

                        output.push(new Token(TokenType.ArgCount, `${argCount}`));
                        output.push(topStack);

                        this.touchArgStartIfNeeded();
                        
                    }

                    const nextToken = tokens[i + 1];

                    //check if next token is a number, if so, we assume multiplication is intented,
                    //  so we push a multiplication operator after the closing parenthesis
                    if (nextToken != null && (nextToken.type === TokenType.Number || nextToken.type === TokenType.Identifier)) {
                        this.operatorStack.push(new Token(TokenType.Operator, "*"));
                    }

                    if (nextToken != null && nextToken.token === "(") {
                        this.operatorStack.push(new Token(TokenType.Operator, "*"));
                    }

                }
            }
           

        }

        while (this.operatorStack.length > 0)
        {
            let topStack = this.operatorStack.pop()!;
            if (topStack.token === "(" || topStack.token === ")")
            {
                raiseError("Mismatched parenthesis", topStack, this.expression);
            }
            output.push(topStack);
        }

        return output;


    }



}