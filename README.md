# ShuntingTS

A small TypeScript expression evaluator built around the shunting-yard algorithm.

It tokenizes an expression, converts it to Reverse Polish Notation (RPN), and evaluates the result with pluggable operators and functions.

When parsing fails, the evaluator reports the exact token position and shows a short slice of the surrounding expression with a caret pointing at the problem area.

## What it supports

- Numbers and decimals
- Variables
- Parentheses
- Binary operators
- Unary `+` and `-`
- Functions with fixed arity or overloads

## Built-in behavior

The default evaluator setup includes these operators:

- `+`
- `-`
- `*`
- `/`
- `^`
- `u+`
- `u-`

It also includes these functions:

- `sqrt(x)`
- `floor(x)`
- `max(...)`
- `rangeSum(...)`

## Evaluate an expression

For programmatic use (e.g. tests), use the synchronous `evaluate(expression, variables)` from `evaluator.ts`. It never prompts for input — any identifier missing from `variables` throws instead.

```ts
import { evaluate } from "./evaluator.js";

const result = evaluate("max(a, b) + sqrt(c)", {
	a: 3,
	b: 7,
	c: 25
});

console.log(result); // 12
```

Identifiers that are not registered as functions are treated as variables.

## Interactive REPL

`evaluator.ts` also exposes an async `main(expression, variables, registry)` and a `runRepl()` that reads expressions from stdin (via `node:readline/promises`) and prompts for any variable missing from `variables`.

```ts
import { main, createDefaultRegistry } from "./evaluator.js";

const result = await main("max(a, b) + sqrt(c)", { a: 3, b: 7, c: 25 }, createDefaultRegistry());
console.log(result); // 12
```

Running the file directly starts the REPL:

```sh
npx tsx src/evaluator.ts
```

`runRepl()` only starts automatically when `evaluator.ts` is the entry module (checked via `import.meta.url` against `process.argv[1]`), so importing it from another module (e.g. `tester.ts`) never opens a stdin prompt.

## Error reporting

Syntax errors are reported with:

- the error message
- the character index or token span where the problem occurred
- a small excerpt of the original expression
- a caret marker pointing to the failing character or token

Examples of parser errors that now include location context:

- misplaced commas
- missing arguments
- mismatched parentheses
- unknown functions
- wrong function arity

This location data is based on the original input string, so the reported position remains correct even when the expression contains whitespace.

For runtime math errors, the evaluator still relies on the registered operation or function to decide whether a bad value should throw. For example, division by zero returns `Infinity` unless you explicitly check for it in the operator implementation.

## Register a custom function

```ts
import { evaluate } from "./evaluator.js";
import { Registry } from "./Registries.js";
import { FunctionSpec } from "./FunctionSpec.js";
import { OperatorSpec } from "./OperatorSpec.js";
import { Associativity } from "./Specs.js";

const registry = new Registry();

registry.registerOperator(new OperatorSpec({
	symbol: "+",
	precedence: 2,
	associativity: Associativity.Left,
	arity: 2,
	operation: (a, b) => a + b
}));

registry.registerFunction(new FunctionSpec({
	symbol: "double",
	fixedArity: true,
	arity: 1,
	operation: (args) => args[0]! * 2
}));

console.log(evaluate("double(4) + 3")); // 11
```

For a custom function:

- `symbol` is the function name used in expressions
- `fixedArity: true` means the function must receive exactly `arity` arguments
- `operation(args)` receives the function arguments as an array

## Register a custom operator

```ts
import { evaluate } from "./evaluator.js";
import { Registry } from "./Registries.js";
import { FunctionSpec } from "./FunctionSpec.js";
import { OperatorSpec } from "./OperatorSpec.js";
import { Associativity } from "./Specs.js";

const registry = new Registry();

registry.registerOperator(new OperatorSpec({
	symbol: "+",
	precedence: 2,
	associativity: Associativity.Left,
	arity: 2,
	operation: (a, b) => a + b
}));

registry.registerOperator(new OperatorSpec({
	symbol: "%",
	precedence: 3,
	associativity: Associativity.Left,
	arity: 2,
	operation: (a, b) => a % b
}));

registry.registerFunction(new FunctionSpec({
	symbol: "id",
	fixedArity: true,
	arity: 1,
	operation: (args) => args[0]!
}));

console.log(evaluate("10 % 3 + id(2)")); // 3
```

For a custom operator:

- `symbol` is the token used in the expression
- `precedence` controls ordering
- `associativity` is `Associativity.Left` or `Associativity.Right`
- `arity` is usually `2` for binary operators or `1` for unary operators

## Function overloads

Functions can also support multiple argument counts.

```ts
import { FunctionSpec, op } from "./FunctionSpec.js";

const clamp = new FunctionSpec({
	symbol: "clamp",
	fixedArity: false,
	minArity: 2,
	overloads: new Map([
		[2, op<[number, number]>(([value, max]) => Math.max(0, Math.min(value, max)))],
		[3, op<[number, number, number]>(([value, min, max]) => Math.max(min, Math.min(value, max)))]
	])
});
```

## Core files

- [Specs.ts](src/Specs.ts) — Shared definitions used across the whole pipeline: the `TokenType` and `Associativity` enums, the `TokenContext` enum used by the tokenizer, and the `Token` class (type, raw text, and source `location`).
- [Tokenizer.ts](src/Tokenizer.ts) — Scans the raw expression string character by character and produces a flat list of `Token`s (numbers, identifiers, operators, unary operators, parentheses, commas), tracking each token's start/end index in the original string for later error reporting.
- [Parser.ts](src/Parser.ts) — Implements the shunting-yard algorithm (`Parser.toRPN`). Consumes the token list and, using operator precedence/associativity and function-arity info from the registry, rearranges it into Reverse Polish Notation (RPN), inserting implicit multiplication and `ArgCount` markers, and validating parentheses/commas along the way.
- [evaluator.ts](src/evaluator.ts) — The orchestration/entry-point module. Builds the default `Registry` (built-in operators and functions), exposes the synchronous `evaluate(expression, variables)` for programmatic use, the async `main(expression, variables, registry)` that ties tokenizing → parsing → RPN evaluation together for the interactive path, and `evalRPN` which walks the RPN output with a stack machine to produce the final numeric result. Also has `promptForMissingVariables` and `runRepl` for interactively asking the user for undefined identifiers and running a stdin-driven REPL, guarded so it only auto-starts when the file is run directly.
- [OperatorSpec.ts](src/OperatorSpec.ts) — Plain data/spec class describing one operator: its symbol, precedence, associativity, arity, and the actual `operation`/`unaryOperation` function that performs the math.
- [FunctionSpec.ts](src/FunctionSpec.ts) — Plain data/spec class describing one function: its symbol, arity rules (fixed arity, min arity, or per-arity overloads), and a `run(args)` method that dispatches to the right implementation.
- [Registries.ts](src/Registries.ts) — Holds the lookup tables (`Map`s) of registered `OperatorSpec`s and `FunctionSpec`s in a single `Registry` class. Provides `isOperator`/`isFunction`/`getOperator`/`getFunction`/`registerOperator`/`registerFunction`.
- [ErrorFormat.ts](src/ErrorFormat.ts) — Formats parser/evaluator errors with source context: given a token and the original expression, it builds a message with the character position, a text snippet, and a caret (`^`) pointing at the offending token, then `raiseError` throws it.
- [tester.ts](src/tester.ts) — Standalone script (not imported by the library) with value tests and expected-error tests that exercise `evaluate` from evaluator.ts and print pass/fail results to the console.

## Design pattern

The project is built around the classic **shunting-yard algorithm** (Tokenizer → Parser → RPN evaluator pipeline), and layers a few object-oriented patterns on top:

- **Strategy pattern** — `OperatorSpec` and `FunctionSpec` each wrap a swappable behavior (`operation`/`unaryOperation`, or per-arity `overloads`) behind a common shape (`symbol`, arity info, `run`/operation call). The parser and evaluator only depend on this shape, so new operators/functions can be plugged in without changing parsing or evaluation logic.
- **Registry pattern** — `Registry` acts as a central lookup service that decouples the tokenizer/parser/evaluator from any hard-coded set of operators or functions; everything is registered at startup and looked up by symbol at runtime.
- **Pipeline pattern** — `evaluate`/`main` in evaluator.ts chain discrete stages (`tokenize` → `Parser.toRPN` → `evalRPN`), each consuming the previous stage's output, similar to a compiler pipeline.

## Notes

- Unknown identifiers are treated as variables
- Unknown operators or invalid function calls throw errors with source context
- Comma and parenthesis validation is handled during parsing with caret-style location output
- Token positions are preserved from the original expression so error spans stay accurate
- Run the interactive REPL with `npx tsx src/evaluator.ts`; run the test suite with `npx tsx src/tester.ts`
