
import { Associativity } from "./Specs.js";

export type BinaryOperation = (a: number, b: number) => number;
export type UnaryOperation = (value: number) => number;

export interface OperatorSpecOptions {
    symbol: string;
    precedence: number;
    arity: number;
    associativity: Associativity;
    operation?: BinaryOperation | undefined;
    unaryOperation?: UnaryOperation | undefined;
}



export class OperatorSpec {
    readonly symbol: string;
    readonly precedence: number;
    readonly arity: number;
    readonly associativity: Associativity;
    readonly operation?: BinaryOperation | undefined;
    readonly unaryOperation?: UnaryOperation | undefined;

    constructor(options: OperatorSpecOptions) {
        this.symbol = options.symbol;
        this.precedence = options.precedence;
        this.arity = options.arity;
        this.associativity = options.associativity;
        this.operation = options.operation;
        this.unaryOperation = options.unaryOperation;
    }
}