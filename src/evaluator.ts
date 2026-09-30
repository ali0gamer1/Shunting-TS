
import { FunctionSpec } from "./FunctionSpec.js";
import { OperatorSpec } from "./OperatorSpec.js";
import { Registry } from "./Registries.js";
import { Parser } from "./Parser.js";
import { tokenize } from "./Tokenizer.js";
import { TokenType, Token } from "./Specs.js";
import { Associativity } from "./Specs.js";
import { raiseError } from "./ErrorFormat.js";
import { op } from "./FunctionSpec.js";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { pathToFileURL } from "node:url";

let rl: ReturnType<typeof createInterface> | undefined;

// Created on first use only, so merely importing this module (e.g. from tester.ts) doesn't hold stdin open.
function getReadline() {
    if (!rl) {
        rl = createInterface({ input: stdin, output: stdout });
    }
    return rl;
}

const getUserInput = (query: string): Promise<string> => getReadline().question(query);



export function createDefaultRegistry() {
    const registry = new Registry();

    registry.registerOperator(new OperatorSpec({
        symbol: '+',
        precedence: 2,
        associativity: Associativity.Left,
        arity: 2,
        operation: (a, b) => a + b
    }));

    registry.registerOperator(new OperatorSpec({
        symbol: '-',
        precedence: 2,
        associativity: Associativity.Left,
        arity: 2,
        operation: (a, b) => a - b
    }));

    registry.registerOperator(new OperatorSpec({
        symbol: '*',
        precedence: 3,
        associativity: Associativity.Left,
        arity: 2,
        operation: (a, b) => a * b
    }));

    registry.registerOperator(new OperatorSpec({
        symbol: '/',
        precedence: 3,
        associativity: Associativity.Left,
        arity: 2,
        operation: (a, b) => {

            if (b === 0) {
                throw new Error("Division by zero");
            }
            return a / b;
        }
    }));

    registry.registerOperator(new OperatorSpec({
        symbol: '^',
        precedence: 4,
        associativity: Associativity.Right,
        arity: 2,
        operation: (a, b) => {
            if (b < 0) {
                throw new Error("Negative exponent not allowed");
            }
            return Math.pow(a, b);
        }
    }));

    registry.registerOperator(new OperatorSpec({
        symbol: 'u+',
        precedence: 5,
        associativity: Associativity.Right,
        arity: 1,
        unaryOperation: (value) => +value
    }));

    registry.registerOperator(new OperatorSpec({
        symbol: 'u-',
        precedence: 5,
        associativity: Associativity.Right,
        arity: 1,
        unaryOperation: (value) => -value
    }));


    registry.registerFunction(new FunctionSpec({
        symbol: 'factorial',
        fixedArity: true,
        arity: 1,
        operation: op<[number]>(([num]) => {
            if (num < 0) {
                throw new Error("Negative factorial not allowed");
            }
            let resulty = 1;
            for (let i = 1; i <= num; i++) {
                resulty *= i;
            } 
            
            return resulty;
        })
    }));

    registry.registerFunction(new FunctionSpec({
        symbol: 'sqrt',
        fixedArity: true,
        arity: 1,
        operation: op<[number]>(([num]) => {
            return Math.sqrt(num);
        })
    }));

    registry.registerFunction(new FunctionSpec({
	symbol: "double",
	fixedArity: true,
	arity: 1,
	operation: op<[number]>(([num]) => num * 2)
    }));


    registry.registerFunction(new FunctionSpec(
        {
            symbol: "floor",
            fixedArity: true,
            arity: 1,
            operation: op<[number]>(([num]) => Math.floor(num))
        }

    ));


    registry.registerFunction(new FunctionSpec({
        symbol: 'max',
        fixedArity: false,
        minArity: 1,
        operation: (args) => Math.max(...args)
    }));

    registry.registerFunction(new FunctionSpec({
        symbol: "rangeSum",
        fixedArity: false,
        minArity: 1,
        overloads: new Map([
            [1, op<[number]>(([num]) => {
                let sum = 0;
                for (let i = 1; i <= num; i++) {
                    sum += i;
                }
                return sum;
            })
            ],
            [2, op<[number, number]>(([start, end]) => {
                let sum = 0;
                for (let i = start; i <= end; i++) {
                    sum += i;
                }
                return sum;
            })
            ],
            [3, op<[number, number, number]>(([start, end, step]) => {
                let sum = 0;
                for (let i = start; i <= end; i += step) {
                    sum += i;
                }
                return sum;
            })
            ]

        ]),


    }));


    return registry;
}

export async function promptForMissingVariables(tokens: Token[], registry: Registry, variables: Record<string, number>) {
    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i]!;

        if (token.type === TokenType.Identifier && !registry.isFunction(token.token)) {


            // Check if it's missing from the passed variables
            if (!Object.prototype.hasOwnProperty.call(variables, token.token)) {
                const ans = await getUserInput(`Unknown identifier "${token.token}".\nPlease assign a numeric value: `);
                const num = Number(ans);

                if (Number.isNaN(num)) {
                    throw new Error(`Value for "${token.token}" must be numeric.`);
                }

                // Cache it so we don't ask again for the same variable
                variables[token.token] = num;
            }
        }
    }
}

export function evalRPN(rpn: Token[], registry: Registry, variables: Record<string, number>, expression = "") {
    const stack: number[] = [];
    const functionArgCountStack: number[] = [];


    for (const token of rpn) {
        if (token.type === TokenType.Number) {
            stack.push(Number(token.token));
            continue;
        }


        //check if variable is defined in the variables object.
        // and do a reinforced check to ensure the identifier is valid and numeric
        if (token.type === TokenType.Identifier && !registry.isFunction(token.token)) {

            if (!Object.prototype.hasOwnProperty.call(variables, token.token)) {
                //throw new Error(`Unknown identifier: ${token.token}`)
                raiseError(`Unknown identifier: ${token.token}`, token, expression);
            }


            if (Number.isNaN(variables[token.token]))
                throw new Error(`Identifier is not numeric: ${token.token}`);

            stack.push(variables[token.token]!);
            continue;
        }



        if (token.type === TokenType.ArgCount) {
            const argCount = Number(token.token);
            if (!Number.isInteger(argCount) || argCount < 0)
                throw new Error(`Invalid function arg marker: ${token.token}`);
            functionArgCountStack.push(argCount);
            continue;
        }

        if (registry.isFunction(token.token)) {
            let argCount = functionArgCountStack.pop()!;
            const functionSpec = registry.getFunction(token.token);

            //reinforced check to ensure the functionSpec is valid
            if (!functionSpec) {
                //throw new Error(`Unknown function in RPN: ${token.token}`);
                raiseError(`Unknown function in RPN: ${token.token}`, token, expression);
            }


            if (stack.length < argCount) {
                //throw new Error(`Insufficient arguments for function: ${token.token}`);
                raiseError(`Insufficient arguments for function: ${token.token}`, token, expression);
            }

            const args = stack.splice(stack.length - argCount, argCount)!;


            if (functionSpec.fixedArity && args.length !== functionSpec.arity) {
                //throw new Error(`Function ${token.token} expects ${functionSpec.arity} arguments, got ${args.length}`);
                raiseError(`Function ${token.token} expects ${functionSpec.arity} arguments, got ${args.length}`, token, expression);
            }



            let result: number;

            try {

                result = functionSpec.run(args);
                stack.push(result);
            }
            catch (error) {
                if (error instanceof Error) {
                    raiseError(error.message, token, expression);
                }
            }


            continue;
        }

        if (registry.isOperator(token.token)) {
            let result: number;
            const operatorSpec = registry.getOperator(token.token);
            if (!operatorSpec) {
                //throw new Error(`Unknown operator in RPN: ${token.token}`);
                raiseError(`Unknown operator in RPN: ${token.token}`, token, expression);
            }

            if (stack.length < operatorSpec.arity) {
                raiseError(`Insufficient arguments for operator: ${token.token}`, token, expression);
            }

            if (operatorSpec.arity === 1) {
                const value = stack.pop()!;
                try {
                    if (operatorSpec.unaryOperation) {
                        result = operatorSpec.unaryOperation(value);
                        stack.push(result);
                    }
                } catch (error) {
                    if (error instanceof Error) {
                        raiseError(error.message, token, expression);
                    }
                }


                continue;
            }


            const b = stack.pop();
            const a = stack.pop();

            try {

                if (operatorSpec.operation) {
                    result = operatorSpec.operation(a!, b!);
                    if (typeof result !== 'number' || Number.isNaN(result)) {
                        //throw new Error(`Operator ${token.token} returned an invalid result`);
                        raiseError(`${result}`, token, expression);
                    }

                    stack.push(result);
                }
            } catch (error) {
                if (error instanceof Error) {
                    raiseError(error.message, token, expression);
                }
            }


        }

    }

    if (stack.length !== 1) {

        console.log("stack:");

        console.log(stack);

        throw new Error('Invalid expression: too many values left on stack');
    }

    return stack[0]!;
}

export async function main(expression: string, variables: Record<string, number>, registry: Registry) {
    const tokens = tokenize(expression, createDefaultRegistry());
    await promptForMissingVariables(tokens, registry, variables);
    const parser = new Parser();
    const RPN = parser.toRPN(tokens,registry, expression);

    return evalRPN(RPN, registry, variables, expression);

}

// Synchronous evaluation for programmatic/test use: missing variables throw instead of prompting.
export function evaluate(expression: string, variables: Record<string, number> = {}) {
    const registry = createDefaultRegistry();
    const tokens = tokenize(expression, registry);
    const parser = new Parser();
    const RPN = parser.toRPN(tokens, registry, expression);

    return evalRPN(RPN, registry, variables, expression);
}

export async function runRepl() {
    while (true) {
        const input = await getUserInput("Enter expression: ");
        if (input === null) {
            break;
        }
        try {
            const result = await main(input, {}, createDefaultRegistry());
            console.log(`Result: ${result}`);
        } catch (error) {
            if (error instanceof Error) {
                console.error(`Error: ${error.message}`);
            }
        }
    }
    rl?.close();
}

// Only start the interactive REPL when this file is run directly (e.g. `node dist/evaluator.js`),
// not when it's imported as a library module (e.g. from tester.ts).
const isMainModule = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
    runRepl().catch((error: unknown) => {
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 1;
    });
}