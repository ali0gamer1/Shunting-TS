

export type FunctionOperation = (args: number[]) => number;


// Helper function to cast a strongly-typed function to a generic FunctionOperation
export function op<T extends number[]>(fn: (args: T) => number): FunctionOperation {
  return fn as FunctionOperation;
}


export interface FunctionSpecOptions
{
    symbol: string;
    fixedArity: boolean;
   
    arity?: number | undefined;
    minArity?: number | undefined;
    overloads?: Map<number, FunctionOperation> | undefined;
    operation?: FunctionOperation | undefined;
}


export class FunctionSpec
{
    readonly symbol: string;
    readonly arity?: number | undefined;
    readonly minArity?: number | undefined;
    readonly fixedArity: boolean;
    readonly overloads: Map<number, FunctionOperation>; // empty object as default for no overloads
    readonly operation: FunctionOperation | undefined;
    
    constructor (specs: FunctionSpecOptions)
    {
        this.symbol = specs.symbol;
        this.fixedArity = specs.fixedArity;
        this.arity = specs.arity;
        this.minArity = specs.minArity;
        this.overloads = specs.overloads ?? new Map<number, FunctionOperation>();
        this.operation = specs.operation;
    }


    run(args: number[]): number
    {
        if (this.operation)
        {
            return this.operation(args);
        }
        
        const overload = this.overloads?.get(args.length);
        if (overload)
        {
            return overload(args);
        }
        throw new Error(`No operation defined for this function with ${args.length} arguments`);
    }


}