/******************************************************************************
 *
 * Copyright (c) 2017, the Perspective Authors.
 *
 * This file is part of the Perspective library, distributed under the terms of
 * the Apache License 2.0.  The full license can be found in the LICENSE file.
 *
 */
import {CstParser} from "chevrotain";
import {vocabulary, ColumnName, Comma, As, LeftParen, RightParen, Sqrt, Pow2, Abs, Add, Subtract, Multiply, Divide, Lowercase, Uppercase, ConcatComma, ConcatSpace} from "./lexer";

export class ComputedColumnParser extends CstParser {
    constructor() {
        super(vocabulary);

        this.RULE("ComputedColumn", () => {
            this.OR([
                {
                    ALT: () => {
                        this.SUBRULE(this.FunctionComputedColumn);
                    }
                },
                {
                    ALT: () => {
                        this.SUBRULE(this.ColumnName, {LABEL: "left"});
                        this.SUBRULE(this.Operator);
                        this.SUBRULE2(this.ColumnName, {LABEL: "right"});
                        this.OPTION(() => {
                            this.SUBRULE(this.As, {LABEL: "as"});
                        });
                    }
                }
            ]);
        });

        this.RULE("ColumnName", () => {
            this.CONSUME(ColumnName);
        });

        this.RULE("As", () => {
            this.CONSUME(As);
            this.SUBRULE(this.ColumnName);
        });

        this.RULE("FunctionComputedColumn", () => {
            this.SUBRULE(this.Function);
            this.CONSUME(LeftParen);
            this.AT_LEAST_ONE_SEP({
                SEP: Comma,
                DEF: () => {
                    this.SUBRULE(this.ColumnName);
                }
            });
            this.CONSUME(RightParen);
            this.OPTION(() => {
                this.SUBRULE(this.As, {LABEL: "as"});
            });
        });

        this.RULE("Function", () => {
            this.OR([
                {ALT: () => this.CONSUME(Sqrt)},
                {ALT: () => this.CONSUME(Pow2)},
                {ALT: () => this.CONSUME(Abs)},
                {ALT: () => this.CONSUME(Uppercase)},
                {ALT: () => this.CONSUME(Lowercase)},
                {ALT: () => this.CONSUME(ConcatComma)},
                {ALT: () => this.CONSUME(ConcatSpace)}
            ]);
        });

        this.RULE("Operator", () => {
            this.OR([{ALT: () => this.CONSUME(Add)}, {ALT: () => this.CONSUME(Subtract)}, {ALT: () => this.CONSUME(Multiply)}, {ALT: () => this.CONSUME(Divide)}]);
        });

        this.performSelfAnalysis();
    }
}
