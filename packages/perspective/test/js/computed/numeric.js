/******************************************************************************
 *
 * Copyright (c) 2017, the Perspective Authors.
 *
 * This file is part of the Perspective library, distributed under the terms of
 * the Apache License 2.0.  The full license can be found in the LICENSE file.
 *
 */
//const common = require("./common.js");

/**
 * Tests the correctness of each numeric computation function in various
 * environments and parameters - different types, nulls, undefined, etc.
 */
module.exports = perspective => {
    describe("Numeric, arity 1", function() {
        it("Square root of int", async function() {
            const table = perspective.table({
                a: [4, 9, 16, 20, 81, 1000]
            });
            let view = table.view({
                columns: ["sqrt"],
                computed_columns: [
                    {
                        column: "sqrt",
                        computed_function_name: "sqrt",
                        inputs: ["a"]
                    }
                ]
            });
            let result = await view.to_columns();
            expect(result.sqrt).toEqual([2, 3, 4, 4.47213595499958, 9, 31.622776601683793]);
            view.delete();
            table.delete();
        });

        it("Square root of int, nulls", async function() {
            const table = perspective.table({
                a: [4, 9, null, undefined, 16]
            });
            let view = table.view({
                columns: ["sqrt"],
                computed_columns: [
                    {
                        column: "sqrt",
                        computed_function_name: "sqrt",
                        inputs: ["a"]
                    }
                ]
            });
            let result = await view.to_columns();
            expect(result.sqrt).toEqual([2, 3, null, null, 4]);
            view.delete();
            table.delete();
        });

        it("Square root of float", async function() {
            const table = perspective.table({
                a: [4.5, 9.5, 16.5, 20.5, 81.5, 1000.5]
            });
            let view = table.view({
                columns: ["sqrt"],
                computed_columns: [
                    {
                        column: "sqrt",
                        computed_function_name: "sqrt",
                        inputs: ["a"]
                    }
                ]
            });
            let result = await view.to_columns();
            expect(result.sqrt).toEqual([2.1213203435596424, 3.082207001484488, 4.06201920231798, 4.527692569068709, 9.027735042633894, 31.63068130786942]);
            view.delete();
            table.delete();
        });

        it("Square root of float, null", async function() {
            const table = perspective.table({
                a: [4.5, 9.5, null, undefined, 16.5]
            });
            let view = table.view({
                columns: ["sqrt"],
                computed_columns: [
                    {
                        column: "sqrt",
                        computed_function_name: "sqrt",
                        inputs: ["a"]
                    }
                ]
            });
            let result = await view.to_columns();
            expect(result.sqrt).toEqual([2.1213203435596424, 3.082207001484488, null, null, 4.06201920231798]);
            view.delete();
            table.delete();
        });

        it("Pow^2 of int", async function() {
            const table = perspective.table({
                a: [2, 4, 6, 8, 10]
            });
            let view = table.view({
                columns: ["pow2"],
                computed_columns: [
                    {
                        column: "pow2",
                        computed_function_name: "x^2",
                        inputs: ["a"]
                    }
                ]
            });
            let result = await view.to_columns();
            expect(result.pow2).toEqual([4, 16, 36, 64, 100]);
            view.delete();
            table.delete();
        });

        it("Pow^2 of int, nulls", async function() {
            const table = perspective.table({
                a: [2, 4, null, undefined, 10]
            });
            let view = table.view({
                columns: ["pow2"],
                computed_columns: [
                    {
                        column: "pow2",
                        computed_function_name: "x^2",
                        inputs: ["a"]
                    }
                ]
            });
            let result = await view.to_columns();
            expect(result.pow2).toEqual([4, 16, null, null, 100]);
            view.delete();
            table.delete();
        });

        it("Pow^2 of float", async function() {
            const table = perspective.table({
                a: [2.5, 4.5, 6.5, 8.5, 10.5]
            });
            let view = table.view({
                columns: ["pow2"],
                computed_columns: [
                    {
                        column: "pow2",
                        computed_function_name: "x^2",
                        inputs: ["a"]
                    }
                ]
            });
            let result = await view.to_columns();
            expect(result.pow2).toEqual([6.25, 20.25, 42.25, 72.25, 110.25]);
            view.delete();
            table.delete();
        });

        it("Pow^2 of float, nulls", async function() {
            const table = perspective.table({
                a: [2.5, 4.5, null, undefined, 10.5]
            });
            let view = table.view({
                columns: ["pow2"],
                computed_columns: [
                    {
                        column: "pow2",
                        computed_function_name: "x^2",
                        inputs: ["a"]
                    }
                ]
            });
            let result = await view.to_columns();
            expect(result.pow2).toEqual([6.25, 20.25, null, null, 110.25]);
            view.delete();
            table.delete();
        });

        it("Invert int", async function() {
            const table = perspective.table({
                a: [2, 4, 6, 8, 10]
            });
            let view = table.view({
                columns: ["invert"],
                computed_columns: [
                    {
                        column: "invert",
                        computed_function_name: "1/x",
                        inputs: ["a"]
                    }
                ]
            });
            let result = await view.to_columns();
            expect(result.invert).toEqual([0.5, 0.25, 0.16666666666666666, 0.125, 0.1]);
            view.delete();
            table.delete();
        });

        it("Invert int, nulls", async function() {
            const table = perspective.table({
                a: [2, 4, null, undefined, 10]
            });
            let view = table.view({
                columns: ["invert"],
                computed_columns: [
                    {
                        column: "invert",
                        computed_function_name: "1/x",
                        inputs: ["a"]
                    }
                ]
            });
            let result = await view.to_columns();
            expect(result.invert).toEqual([0.5, 0.25, null, null, 0.1]);
            view.delete();
            table.delete();
        });

        it("Invert float", async function() {
            const table = perspective.table({
                a: [2.5, 4.5, 6.5, 8.5, 10.5]
            });
            let view = table.view({
                columns: ["invert"],
                computed_columns: [
                    {
                        column: "invert",
                        computed_function_name: "1/x",
                        inputs: ["a"]
                    }
                ]
            });
            let result = await view.to_columns();
            expect(result.invert).toEqual([0.4, 0.2222222222222222, 0.15384615384615385, 0.11764705882352941, 0.09523809523809523]);
            view.delete();
            table.delete();
        });

        it("Invert float, nulls", async function() {
            const table = perspective.table({
                a: [2.5, 4.5, null, undefined, 10.5]
            });
            let view = table.view({
                columns: ["invert"],
                computed_columns: [
                    {
                        column: "invert",
                        computed_function_name: "1/x",
                        inputs: ["a"]
                    }
                ]
            });
            let result = await view.to_columns();
            expect(result.invert).toEqual([0.4, 0.2222222222222222, null, null, 0.09523809523809523]);
            view.delete();
            table.delete();
        });
    });
};
