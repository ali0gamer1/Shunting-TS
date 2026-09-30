import type { FunctionSpec } from "./FunctionSpec.js";
import type { OperatorSpec } from "./OperatorSpec.js";

/** Lookup table of operators and functions known to the tokenizer/parser/evaluator. */
export class Registry {
    private readonly operators = new Map<string, OperatorSpec>();
    private readonly functions = new Map<string, FunctionSpec>();

    isOperator(token: string): boolean {
        return this.operators.has(token);
    }

    getOperator(token: string): OperatorSpec | undefined {
        return this.operators.get(token);
    }

    registerOperator(operatorSpec: OperatorSpec): void {
        this.operators.set(operatorSpec.symbol, operatorSpec);
    }

    isFunction(token: string): boolean {
        return this.functions.has(token);
    }

    getFunction(token: string): FunctionSpec | undefined {
        return this.functions.get(token);
    }

    registerFunction(functionSpec: FunctionSpec): void {
        this.functions.set(functionSpec.symbol, functionSpec);
    }
}
