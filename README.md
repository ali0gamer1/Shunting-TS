# Shunting-Yard Expression Evaluator (TypeScript)

TypeScript port of the original JavaScript expression evaluator. Tokenizes, parses (shunting-yard
algorithm → RPN), and evaluates arithmetic expressions with variables, functions, operator
precedence/associativity, and source-located error messages.

## Layout

- `src/Specs.ts` — `TokenType`/`Associativity`/`TokenContext` enums and the `Token` class.
- `src/ErrorFormat.ts` — source-snippet error formatting and the `ExpressionError` class.
- `src/OperatorSpec.ts` / `src/FunctionSpec.ts` — operator/function descriptors.
- `src/Registries.ts` — operator/function lookup table.
- `src/Tokenizer.ts` — `tokenize()`.
- `src/Parser.ts` — `Parser.toRPN()`.
- `src/evaluator.ts` — **main entry point**: default registry, `evaluate()`, `evalRPN()`, and the
  interactive REPL (only starts when this file is run directly, not when imported).
- `src/tester.ts` — value/error test harness (ported from the original `tester.js`).

## Usage

```bash
npm install
npm run build      # compile to dist/
npm start           # run the interactive REPL (dist/evaluator.js)
npm test            # build + run the test harness (dist/tester.js)

# or, without a build step:
npm run dev          # REPL via tsx
npm run test:dev     # tests via tsx
```

## Notes on the port

- Renamed `main` → `evaluate`; PascalCase methods (`RegisterOperator`, `GetFunction`, ...) → camelCase.
- Dropped the redundant duplicate `Symbol`/`symbol` properties on `OperatorSpec`/`FunctionSpec` in
  favor of a single `symbol` field.
- Fixed two bugs found during the port:
  1. `promptForMissingVariables` called an undefined `question()` function — it now takes an
     injected async `prompt` callback, used only by the REPL (readline-backed).
  2. The REPL loop used to start unconditionally on import (so importing `evaluator.js` from
     `tester.js` also spun up a stdin prompt). It's now guarded to only run when the file is
     executed directly.
- Strict TypeScript (`strict`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, `noUnusedLocals`, ...)
  with Node's native ESM + NodeNext module resolution.
