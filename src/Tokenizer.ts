
import { Token, TokenType, TokenContext } from "./Specs.js";
import type { Registry } from "./Registries.js";


function isAlpha(char: string): boolean {
    return (char >= "a" && char <= "z") ||
           (char >= "A" && char <= "Z");
}


export function tokenize(input: string, registry:Registry): Token[]
{
    const tokens: Token[] = [];

    let currentToken = "";
    let currentTokenType = TokenType.None;
    let currentTokenStart = -1;
    let lastContext = TokenContext.ExpectValue;


    for(let i = 0; i < input.length; i++)
    {
        const char = input.charAt(i);

        if (char >= '0' && char <= '9' || char === '.' && currentTokenType === TokenType.Number)
        {
            if (currentToken == "")
            {
                currentTokenType = TokenType.Number;
                currentTokenStart = i;
            }

            if (currentTokenType === TokenType.Identifier)
            {
                const tokenObj = new Token(currentTokenType, currentToken, { startIndex: currentTokenStart, endIndex: i - 1 });
                tokens.push(tokenObj);
                
                

                currentToken = "";
                currentTokenType = TokenType.Number;
                currentTokenStart = i;
            }

            currentToken += char;
        }
        
        else if (isAlpha(char))
        {
            if (currentToken == "")
            {
                currentTokenType = TokenType.Identifier;
                currentTokenStart = i;
            }

            if (currentTokenType === TokenType.Number)
            {
                const tokenObj = new Token(currentTokenType, currentToken, { startIndex: currentTokenStart, endIndex: i - 1 });
                tokens.push(tokenObj);
                
                currentToken = "";
                currentTokenType = TokenType.Identifier;
                currentTokenStart = i;
            }

            currentToken += char;
        }

        else if (registry.isOperator(char))
        {
            let hasPending = currentToken.length > 0;
            let contextForOp = hasPending ? TokenContext.ValueEnded : lastContext;
            
            if (hasPending)
            {
                const tokenObj = new Token(currentTokenType, currentToken, { startIndex: currentTokenStart, endIndex: i - 1 });
                tokens.push(tokenObj);

                currentToken = "";
                currentTokenType = TokenType.None;
            }

            let isPlusMinus = char === '+' || char === '-';
            let isUnary = isPlusMinus && (contextForOp === TokenContext.ExpectValue );

            if(isUnary)
            {
                const tokenObj = new Token(TokenType.UnaryOperator, `u${char}`, { startIndex: i, endIndex: i });
                tokens.push(tokenObj);

            }
            else
            {
                const tokenObj = new Token(TokenType.Operator, char, { startIndex: i, endIndex: i });
                tokens.push(tokenObj);
            }

            lastContext = TokenContext.ExpectValue;
        }

        else if (char === '(' || char === ')')
        {
            if (currentToken.length > 0)
            {
                const tokenObj = new Token(currentTokenType, currentToken, { startIndex: currentTokenStart, endIndex: i - 1 });
                tokens.push(tokenObj);

                currentToken = "";
                currentTokenType = TokenType.None;
            }

            if (char === '(')
                lastContext = TokenContext.ExpectValue;
            else
                lastContext = TokenContext.ValueEnded;

            const tokenObj = new Token(TokenType.Parenthesis, char, { startIndex: i, endIndex: i });
            tokens.push(tokenObj);


        }

        else if (char === ',')
        {
            if (currentToken.length > 0)
            {
                const tokenObj = new Token(currentTokenType, currentToken, { startIndex: currentTokenStart, endIndex: i - 1 });
                tokens.push(tokenObj);
                currentToken = "";
                currentTokenType = TokenType.None;
            }

            lastContext = TokenContext.ExpectValue;
            const tokenObj = new Token(TokenType.Comma, char, { startIndex: i, endIndex: i });
            tokens.push(tokenObj);
        }

    }

    if (currentToken.length > 0)
    {
        const tokenObj = new Token(currentTokenType, currentToken, { startIndex: currentTokenStart, endIndex: input.length - 1 });
        tokens.push(tokenObj);
    }

    return tokens;


}