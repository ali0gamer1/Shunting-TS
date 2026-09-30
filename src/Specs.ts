/** Discriminates what kind of lexical unit a {@link Token} represents. */
export enum TokenType {
    None,
    Number,
    Identifier,
    UnaryOperator,
    Parenthesis,
    Comma,
    Operator,
    ArgCount,
}

/** Operator associativity used by the shunting-yard algorithm to break precedence ties. */
export enum Associativity {
    None,
    Left,
    Right,
}

/** Tracks whether the tokenizer currently expects a value or just finished one, to disambiguate unary +/-. */
export enum TokenContext {
    ExpectValue,
    ValueEnded,
}

/** Half-open-free inclusive character range of a token within the source expression, used for error reporting. */
export interface TokenLocation {
    startIndex: number;
    endIndex: number;
}

/**
 * A single lexical unit produced by the tokenizer and consumed by the parser/evaluator.
 * `token` is a string for every kind except {@link TokenType.ArgCount}, which carries a numeric argument count.
 */
export class Token {
    type: TokenType;
    token: string;
    location: TokenLocation;

    constructor(type: TokenType, token: string, location?: TokenLocation) {
        this.type = type;
        this.token = token;
        this.location = location ?? { startIndex: -1, endIndex: -1 };
    }
}
