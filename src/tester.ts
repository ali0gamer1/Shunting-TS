import { evaluate } from "./evaluator.js";
const EPSILON = 1e-10;

function nearlyEqual(a: number, b: number, epsilon = EPSILON): boolean {
    return Math.abs(a - b) <= epsilon;
}

interface ValueTest {
    name: string;
    expression: string;
    expected: number;
    variables?: Record<string, number>;
}

interface ErrorTest {
    name: string;
    expression: string;
    expectedMessagePart: string;
    variables?: Record<string, number>;
}

function runValueTest({ name, expression, expected, variables = {} }: ValueTest): boolean {
    try {
        const actual = evaluate(expression, variables);

        const pass = Number.isFinite(expected) ? nearlyEqual(actual, expected) : Object.is(actual, expected);

        if (!pass) {
            console.log(`❌ ${name}`);
            console.log(`   expression: ${expression}`);
            console.log(`   expected:   ${expected}`);
            console.log(`   actual:     ${actual}`);
            return false;
        }

        console.log(`✅ ${name}`);
        return true;
    } catch (error) {
        console.log(`❌ ${name}`);
        console.log(`   expression: ${expression}`);
        console.log(`   expected value: ${expected}`);
        console.log(`   threw: ${error instanceof Error ? error.message : String(error)}`);
        return false;
    }
}

function runErrorTest({ name, expression, expectedMessagePart, variables = {} }: ErrorTest): boolean {
    try {
        const actual = evaluate(expression, variables);
        console.log(`❌ ${name}`);
        console.log(`   expression: ${expression}`);
        console.log(`   expected error containing: "${expectedMessagePart}"`);
        console.log(`   actual value: ${actual}`);
        return false;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const pass = message.includes(expectedMessagePart);
        if (!pass) {
            console.log(`❌ ${name}`);
            console.log(`   expression: ${expression}`);
            console.log(`   expected error containing: "${expectedMessagePart}"`);
            console.log(`   actual error: "${message}"`);
            return false;
        }

        console.log(`✅ ${name}`);
        return true;
    }
}

const valueTests: ValueTest[] = [
    {
        name: "Parentheses + precedence",
        expression: "3 + 4 * 2 / (1 - 5) ^ 2 ^ 3",
        expected: 3.0001220703125,
    },
    {
        name: "Nested parentheses",
        expression: "((2 + 3) * (7 - 4)) / 5",
        expected: 3,
    },
    {
        name: "Floating point addition",
        expression: "0.1 + 0.2",
        expected: 0.3,
    },
    {
        name: "Floating point in grouped expression",
        expression: "(1.5 + 2.25) * 2",
        expected: 7.5,
    },
    {
        name: "Unary minus",
        expression: "-3 + 5",
        expected: 2,
    },
    {
        name: "Unary minus after operator",
        expression: "2 * -3",
        expected: -6,
    },
    {
        name: "Unary plus",
        expression: "+4 + 1",
        expected: 5,
    },
    {
        name: "Function sqrt",
        expression: "sqrt(16)",
        expected: 4,
    },
    {
        name: "Function max with commas",
        expression: "max(1, 5, 3, 9, 2)",
        expected: 9,
    },
    {
        name: "Function max with floats",
        expression: "max(1.1, 1.01, 1.001)",
        expected: 1.1,
    },
    {
        name: "Function rangeSum 2 args",
        expression: "rangeSum(1, 5)",
        expected: 15,
    },
    {
        name: "Function rangeSum 3 args",
        expression: "rangeSum(1, 10, 2)",
        expected: 25,
    },
    {
        name: "Nested functions",
        expression: "sqrt(max(9, 16))",
        expected: 4,
    },
    {
        name: "Variables + functions + parentheses",
        expression: "max(a, b) + sqrt(c)",
        variables: { a: 3, b: 7, c: 25 },
        expected: 12,
    },
    {
        name: "Variables with floating-point values",
        expression: "(x + y) / 2",
        variables: { x: 1.25, y: 2.75 },
        expected: 2,
    },
    {
        name: "Identifier before parentheses implies multiplication",
        expression: "x(2 + 3)",
        variables: { x: 4 },
        expected: 20,
    },
];

const errorTests: ErrorTest[] = [
    {
        name: "single comma-value test",
        expression: "sqrt(4,)",
        expectedMessagePart: "Misplaced comma",
    },
    {
        name: "Misplaced comma",
        expression: "1,2",
        expectedMessagePart: "Misplaced comma",
    },
    {
        name: "Double comma in function",
        expression: "max(1,,2)",
        expectedMessagePart: "Missing argument",
    },
    {
        name: "Leading comma in function",
        expression: "max(,1)",
        expectedMessagePart: "Missing argument",
    },
    {
        name: "Missing closing parenthesis",
        expression: "(1 + 2",
        expectedMessagePart: "Mismatched parenthesis",
    },
    {
        name: "Identifier must be numeric",
        expression: "x + 1",
        variables: { x: Number.NaN },
        expectedMessagePart: "Identifier is not numeric",
    },
    {
        name: "Wrong fixed arity",
        expression: "sqrt(16, 4)",
        expectedMessagePart: "expects 1 arguments",
    },
];

let passed = 0;
let total = 0;

console.log("\n=== VALUE TESTS ===");
for (const test of valueTests) {
    total += 1;
    if (runValueTest(test)) passed += 1;
}

console.log("\n=== ERROR TESTS ===");
for (const test of errorTests) {
    total += 1;
    if (runErrorTest(test)) passed += 1;
}

console.log("\n=====================");
console.log(`Passed ${passed}/${total} tests`);
console.log("=====================\n");

if (passed !== total) {
    process.exitCode = 1;
}
