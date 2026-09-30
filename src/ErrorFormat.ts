import type { Token } from "./Specs.js";

/**
 * Builds a human-readable snippet pointing at the offending token within the original expression,
 * e.g. `Unknown identifier: y (at position 4)\n  x + y\n      ^`.
 * Falls back to the plain message when location info isn't available.
 */
export function formatErrorLocation(message: string, token?: Token, expression = ""): string {
    if (!token || token.location.startIndex == null || !expression) {
        return message;
    }

    const start = token.location.startIndex;
    const end =
        token.location.endIndex != null && token.location.endIndex >= start ? token.location.endIndex : start;

    const radius = 12;
    const contextStart = Math.max(0, start - radius);
    const contextEnd = Math.min(expression.length - 1, end + radius);

    const before = expression.slice(contextStart, start);
    const errorText = expression.slice(start, end + 1);
    const after = expression.slice(end + 1, contextEnd + 1);

    const prefixEllipsis = contextStart > 0 ? "..." : "";
    const suffixEllipsis = contextEnd < expression.length - 1 ? "..." : "";

    const snippet = `${prefixEllipsis}${before}${errorText}${after}${suffixEllipsis}`;
    const caretPadding = " ".repeat(prefixEllipsis.length + before.length);
    const caret = "^".repeat(end - start + 1);

    const positionLabel = start === end ? `position ${start}` : `positions ${start}-${end}`;

    return `${message} (at ${positionLabel})\n  ${snippet}\n  ${caretPadding}${caret}`;
}

/** Error raised while tokenizing, parsing, or evaluating an expression; carries the offending token for context. */
export class ExpressionError extends Error {
    readonly token?: Token | undefined;
    readonly expression?: string | undefined;

    constructor(message: string, token?: Token, expression?: string) {
        super(message);
        this.name = "ExpressionError";
        this.token = token;
        this.expression = expression;
    }
}

/** Formats `message` with source location context (when available) and throws it as an {@link ExpressionError}. */
export function raiseError(message: string, token?: Token, expression = ""): never {
    throw new ExpressionError(formatErrorLocation(message, token, expression), token, expression);
}
