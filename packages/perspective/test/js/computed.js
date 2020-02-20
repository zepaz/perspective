/******************************************************************************
 *
 * Copyright (c) 2017, the Perspective Authors.
 *
 * This file is part of the Perspective library, distributed under the terms of
 * the Apache License 2.0.  The full license can be found in the LICENSE file.
 *
 */

const common = require("./computed/common.js");
const functionality = require("./computed/functionality.js");
const numeric = require("./computed/numeric.js");
const string = require("./computed/string.js");
const datetime = require("./computed/datetime.js");

module.exports = perspective => {
    functionality(perspective);
    numeric(perspective);
    string(perspective);
    datetime(perspective);

    describe.skip("computed columns", function() {
        describe("types", function() {
            describe("Arity 1", function() {
                it("Should compute functions between all types, abs", async function() {
                    for (let i = 0; i < common.cols.length; i++) {
                        const x = common.cols[i];
                        const name = `abs(${x})`;
                        let table = perspective.table(common.arrow.slice()).add_computed([
                            {
                                computed_function_name: "abs",
                                inputs: [x],
                                column: name
                            }
                        ]);

                        let view = table.view({
                            columns: [name, x]
                        });

                        let results = await view.to_columns();
                        expect(results[name]).toEqual(results[x]);
                        view.delete();
                        table.delete();
                    }
                });

                it("Should compute functions between all types, sqrt", async function() {
                    for (let i = 0; i < common.cols.length; i++) {
                        const x = common.cols[i];
                        const name = `sqrt(${x})`;
                        let table = perspective.table(common.arrow.slice()).add_computed([
                            {
                                computed_function_name: "sqrt",
                                inputs: [x],
                                column: name
                            }
                        ]);

                        let view = table.view({
                            columns: [name, x]
                        });

                        let results = await view.to_columns();
                        expect(results[name]).toEqual(results[x].map(val => Math.sqrt(val)));
                        view.delete();
                        table.delete();
                    }
                });

                it("Should compute functions between all types, invert", async function() {
                    for (let i = 0; i < common.cols.length; i++) {
                        const x = common.cols[i];
                        const name = `invert(${x})`;
                        let table = perspective.table(common.arrow.slice()).add_computed([
                            {
                                computed_function_name: "1/x",
                                inputs: [x],
                                column: name
                            }
                        ]);

                        let view = table.view({
                            columns: [name, x]
                        });

                        let results = await view.to_columns();
                        let expected = results[x].map(val => 1 / val);
                        expected[0] = null;
                        expect(results[name]).toEqual(expected);
                        view.delete();
                        table.delete();
                    }
                });

                it("Should compute functions between all types, pow", async function() {
                    for (let i = 0; i < common.cols.length; i++) {
                        const x = common.cols[i];
                        const name = `pow(${x})`;
                        let table = perspective.table(common.arrow.slice()).add_computed([
                            {
                                computed_function_name: "x^2",
                                inputs: [x],
                                column: name
                            }
                        ]);

                        let view = table.view({
                            columns: [name, x]
                        });

                        let results = await view.to_columns();
                        let expected = results[x].map(val => Math.pow(val, 2));
                        expect(results[name]).toEqual(expected);
                        view.delete();
                        table.delete();
                    }
                });

                it("Should compute functions between all types, bucket 10", async function() {
                    for (let i = 0; i < common.cols.length; i++) {
                        const x = common.cols[i];
                        const name = `bucket(${x})`;
                        let table = perspective.table(common.arrow.slice()).add_computed([
                            {
                                computed_function_name: "Bucket (10)",
                                inputs: [x],
                                column: name
                            }
                        ]);

                        let view = table.view({
                            columns: [name, x]
                        });

                        let results = await view.to_columns();
                        let expected = results[x].map(val => Math.floor(val / 10) * 10);
                        expect(results[name]).toEqual(expected);
                        view.delete();
                        table.delete();
                    }
                });

                it("Should compute functions between all types, bucket 100", async function() {
                    for (let i = 0; i < common.cols.length; i++) {
                        const x = common.cols[i];
                        const name = `bucket(${x})`;
                        let table = perspective.table(common.arrow.slice()).add_computed([
                            {
                                computed_function_name: "Bucket (100)",
                                inputs: [x],
                                column: name
                            }
                        ]);

                        let view = table.view({
                            columns: [name, x]
                        });

                        let results = await view.to_columns();
                        let expected = results[x].map(val => Math.floor(val / 100) * 100);
                        expect(results[name]).toEqual(expected);
                        view.delete();
                        table.delete();
                    }
                });

                it("Should compute functions between all types, bucket 1000", async function() {
                    for (let i = 0; i < common.cols.length; i++) {
                        const x = common.cols[i];
                        const name = `bucket(${x})`;
                        let table = perspective.table(common.arrow.slice()).add_computed([
                            {
                                computed_function_name: "Bucket (1000)",
                                inputs: [x],
                                column: name
                            }
                        ]);

                        let view = table.view({
                            columns: [name, x]
                        });

                        let results = await view.to_columns();
                        let expected = results[x].map(val => Math.floor(val / 1000) * 1000);
                        expect(results[name]).toEqual(expected);
                        view.delete();
                        table.delete();
                    }
                });

                it("Should compute functions between all types, bucket 1/10", async function() {
                    for (let i = 0; i < common.cols.length; i++) {
                        const x = common.cols[i];
                        const name = `bucket(${x})`;
                        let table = perspective.table(common.arrow.slice()).add_computed([
                            {
                                computed_function_name: "Bucket (1/10)",
                                inputs: [x],
                                column: name
                            }
                        ]);

                        let view = table.view({
                            columns: [name, x]
                        });

                        let results = await view.to_columns();
                        let expected = results[x].map(val => Math.floor(val / 0.1) * 0.1);
                        expect(results[name]).toEqual(expected);
                        view.delete();
                        table.delete();
                    }
                });

                it("Should compute functions between all types, bucket 1/100", async function() {
                    for (let i = 0; i < common.cols.length; i++) {
                        const x = common.cols[i];
                        const name = `bucket(${x})`;
                        let table = perspective.table(common.arrow.slice()).add_computed([
                            {
                                computed_function_name: "Bucket (1/100)",
                                inputs: [x],
                                column: name
                            }
                        ]);

                        let view = table.view({
                            columns: [name, x]
                        });

                        let results = await view.to_columns();
                        let expected = results[x].map(val => Math.floor(val / 0.01) * 0.01);
                        expect(results[name]).toEqual(expected);
                        view.delete();
                        table.delete();
                    }
                });

                it("Should compute functions between all types, bucket 1/1000", async function() {
                    for (let i = 0; i < common.cols.length; i++) {
                        const x = common.cols[i];
                        const name = `bucket(${x})`;
                        let table = perspective.table(common.arrow.slice()).add_computed([
                            {
                                computed_function_name: "Bucket (1/1000)",
                                inputs: [x],
                                column: name
                            }
                        ]);

                        let view = table.view({
                            columns: [name, x]
                        });

                        let results = await view.to_columns();
                        let expected = results[x].map(val => Math.floor(val / 0.001) * 0.001);
                        expect(results[name]).toEqual(expected);
                        view.delete();
                        table.delete();
                    }
                });
            });

            describe("Arity 2", function() {
                it("Should compute functions between all types, add", async function() {
                    const int_result = [0, 2, 6, 8, 12, 14, 18, 20, 24, 26];
                    const int_float_result = [0, 2.5, 6, 8.5, 12, 14.5, 18, 20.5, 24, 26.5];
                    const float_result = [0, 3, 6, 9, 12, 15, 18, 21, 24, 27];
                    for (let i = 0; i < common.cols.length; i++) {
                        for (let j = 0; j < common.cols.length; j++) {
                            const x = common.cols[i];
                            const y = common.cols[j];
                            const name = `(${x} + ${y})`;
                            let table = perspective.table(common.arrow.slice()).add_computed([
                                {
                                    computed_function_name: "+",
                                    inputs: [x, y],
                                    column: name
                                }
                            ]);

                            let view = table.view({
                                columns: [name]
                            });

                            let results = await view.to_columns();
                            let comparison;

                            if (i > 7 && j > 7) {
                                comparison = float_result;
                            } else if (i > 7 || j > 7) {
                                comparison = int_float_result;
                            } else {
                                comparison = int_result;
                            }

                            expect(results[name]).toEqual(comparison);
                            view.delete();
                            table.delete();
                        }
                    }
                });

                it("Should compute functions between all types, subtract", async function() {
                    const int_result = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
                    const int_float_result = [0, -0.5, 0, -0.5, 0, -0.5, 0, -0.5, 0, -0.5];
                    const float_int_result = [0, 0.5, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0.5];
                    for (let i = 0; i < common.cols.length; i++) {
                        for (let j = 0; j < common.cols.length; j++) {
                            const x = common.cols[i];
                            const y = common.cols[j];
                            const name = `(${x} - ${y})`;
                            let table = perspective.table(common.arrow.slice()).add_computed([
                                {
                                    computed_function_name: "-",
                                    inputs: [x, y],
                                    column: name
                                }
                            ]);

                            let view = table.view({
                                columns: [name]
                            });

                            let results = await view.to_columns();
                            let comparison;

                            if (x.includes("i") && y.includes("f")) {
                                comparison = int_float_result;
                            } else if (x.includes("f") && y.includes("i")) {
                                comparison = float_int_result;
                            } else {
                                comparison = int_result;
                            }

                            expect(results[name]).toEqual(comparison);
                            view.delete();
                            table.delete();
                        }
                    }
                });

                it("Should compute functions between all types, multiply", async function() {
                    const int_result = [0, 1, 9, 16, 36, 49, 81, 100, 144, 169];
                    const int_float_result = [0, 1.5, 9, 18, 36, 52.5, 81, 105, 144, 175.5];
                    const float_result = [0, 2.25, 9, 20.25, 36, 56.25, 81, 110.25, 144, 182.25];
                    for (let i = 0; i < common.cols.length; i++) {
                        for (let j = 0; j < common.cols.length; j++) {
                            const x = common.cols[i];
                            const y = common.cols[j];
                            const name = `(${x} * ${y})`;
                            let table = perspective.table(common.arrow.slice()).add_computed([
                                {
                                    computed_function_name: "*",
                                    inputs: [x, y],
                                    column: name
                                }
                            ]);

                            let view = table.view({
                                columns: [name]
                            });

                            let results = await view.to_columns();
                            let comparison;

                            if (x.includes("f") && y.includes("f")) {
                                comparison = float_result;
                            } else if (x.includes("f") || y.includes("f")) {
                                comparison = int_float_result;
                            } else {
                                comparison = int_result;
                            }

                            expect(results[name]).toEqual(comparison);
                            view.delete();
                            table.delete();
                        }
                    }
                });

                it("Should compute functions between all types, divide", async function() {
                    const int_result = [null, 1, 1, 1, 1, 1, 1, 1, 1, 1];
                    const int_float_result = [null, 0.6666666666666666, 1, 0.8888888888888888, 1, 0.9333333333333333, 1, 0.9523809523809523, 1, 0.9629629629629629];
                    const int_float_result_precise = [null, 0.6666666865348816, 1, 0.8888888955116272, 1, 0.9333333373069763, 1, 0.9523809552192688, 1, 0.9629629850387573];
                    const float_int_result = [null, 1.5, 1, 1.125, 1, 1.0714285714285714, 1, 1.05, 1, 1.0384615384615385];
                    for (let i = 0; i < common.cols.length; i++) {
                        for (let j = 0; j < common.cols.length; j++) {
                            const x = common.cols[i];
                            const y = common.cols[j];
                            const name = `(${x} / ${y})`;
                            let table = perspective.table(common.arrow.slice()).add_computed([
                                {
                                    computed_function_name: "/",
                                    inputs: [x, y],
                                    column: name
                                }
                            ]);

                            let view = table.view({
                                columns: [name]
                            });

                            let results = await view.to_columns();
                            let comparison;

                            // 8 and 16-bit less precise when divided out
                            const narrow = i < 8 && j > 7;

                            if (narrow) {
                                comparison = int_float_result;
                            } else if (x.includes("f") && y.includes("i")) {
                                comparison = float_int_result;
                            } else if (x.includes("i") && y.includes("f")) {
                                comparison = int_float_result_precise;
                            } else {
                                comparison = int_result;
                            }

                            expect(results[name]).toEqual(comparison);
                            view.delete();
                            table.delete();
                        }
                    }
                });

                it("Should compute functions between all types, percent a of b", async function() {
                    const int_result = [null, 100, 100, 100, 100, 100, 100, 100, 100, 100];
                    const int_float_result = [null, 66.66666666666666, 100, 88.8888888888888888, 100, 93.33333333333333, 100, 95.23809523809523, 100, 96.29629629629629];
                    const float_int_result = [null, 150, 100, 112.5, 100, 107.14285714285714, 100, 105, 100, 103.84615384615385];
                    for (let i = 0; i < common.cols.length; i++) {
                        for (let j = 0; j < common.cols.length; j++) {
                            const x = common.cols[i];
                            const y = common.cols[j];
                            const name = `(${x} % ${y})`;
                            let table = perspective.table(common.arrow.slice()).add_computed([
                                {
                                    computed_function_name: "%",
                                    inputs: [x, y],
                                    column: name
                                }
                            ]);

                            let view = table.view({
                                columns: [name, x, y]
                            });

                            let results = await view.to_columns();
                            let expected;

                            if (x.includes("i") && y.includes("f")) {
                                expected = int_float_result;
                            } else if (x.includes("f") && y.includes("i")) {
                                expected = float_int_result;
                            } else {
                                expected = int_result;
                            }
                            expect(results[name]).toEqual(expected);
                            view.delete();
                            table.delete();
                        }
                    }
                });
            });
        });

        describe("row pivots", function() {
            it("should update on dependent columns", async function() {
                const table = perspective
                    .table([
                        {int: 1, float: 2.25, string: "a", datetime: new Date()},
                        {int: 2, float: 3.5, string: "b", datetime: new Date()},
                        {int: 3, float: 4.75, string: "c", datetime: new Date()},
                        {int: 4, float: 5.25, string: "d", datetime: new Date()}
                    ])
                    .add_computed([
                        {
                            column: "int+float",
                            computed_function_name: "+",
                            inputs: ["int", "float"]
                        }
                    ]);

                let view = table.view({
                    row_pivots: ["int+float"]
                });

                table.update([{int: 4, __INDEX__: 0}]);

                let json = await view.to_json({
                    index: true
                });

                expect(json).toEqual([
                    {__ROW_PATH__: [], int: 13, "int+float": 28.75, float: 15.75, string: 4, datetime: 4, __INDEX__: [0, 3, 2, 1]},
                    {__ROW_PATH__: [5.5], int: 2, "int+float": 5.5, float: 3.5, string: 1, datetime: 1, __INDEX__: [1]},
                    {__ROW_PATH__: [6.25], int: 4, "int+float": 6.25, float: 2.25, string: 1, datetime: 1, __INDEX__: [0]},
                    {__ROW_PATH__: [7.75], int: 3, "int+float": 7.75, float: 4.75, string: 1, datetime: 1, __INDEX__: [2]},
                    {__ROW_PATH__: [9.25], int: 4, "int+float": 9.25, float: 5.25, string: 1, datetime: 1, __INDEX__: [3]}
                ]);

                view.delete();
                table.delete();
            });

            it("should update on dependent columns, add", async function() {
                const table = perspective
                    .table([
                        {int: 1, float: 2.25, string: "a", datetime: new Date()},
                        {int: 2, float: 3.5, string: "b", datetime: new Date()},
                        {int: 3, float: 4.75, string: "c", datetime: new Date()},
                        {int: 4, float: 5.25, string: "d", datetime: new Date()}
                    ])
                    .add_computed([
                        {
                            column: "int+float",
                            computed_function_name: "+",
                            inputs: ["int", "float"]
                        }
                    ]);

                let view = table.view({
                    row_pivots: ["int+float"]
                });

                table.update([{int: 4, __INDEX__: 0}]);

                let json = await view.to_json({
                    index: true
                });

                expect(json).toEqual([
                    {__ROW_PATH__: [], int: 13, "int+float": 28.75, float: 15.75, string: 4, datetime: 4, __INDEX__: [0, 3, 2, 1]},
                    {__ROW_PATH__: [5.5], int: 2, "int+float": 5.5, float: 3.5, string: 1, datetime: 1, __INDEX__: [1]},
                    {__ROW_PATH__: [6.25], int: 4, "int+float": 6.25, float: 2.25, string: 1, datetime: 1, __INDEX__: [0]},
                    {__ROW_PATH__: [7.75], int: 3, "int+float": 7.75, float: 4.75, string: 1, datetime: 1, __INDEX__: [2]},
                    {__ROW_PATH__: [9.25], int: 4, "int+float": 9.25, float: 5.25, string: 1, datetime: 1, __INDEX__: [3]}
                ]);

                view.delete();
                table.delete();
            });

            it("should update on dependent columns, subtract", async function() {
                const table = perspective
                    .table([
                        {int: 1, float: 2.25, string: "a", datetime: new Date()},
                        {int: 2, float: 3.5, string: "b", datetime: new Date()},
                        {int: 3, float: 4.75, string: "c", datetime: new Date()},
                        {int: 4, float: 5.25, string: "d", datetime: new Date()}
                    ])
                    .add_computed([
                        {
                            column: "int-float",
                            computed_function_name: "-",
                            inputs: ["int", "float"]
                        }
                    ]);

                let view = table.view({
                    row_pivots: ["int-float"]
                });

                table.update([{int: 4, __INDEX__: 0}]);

                let json = await view.to_json({
                    index: true
                });

                expect(json).toEqual([
                    {__ROW_PATH__: [], int: 13, "int-float": -2.75, float: 15.75, string: 4, datetime: 4, __INDEX__: [0, 3, 1, 2]},
                    {__ROW_PATH__: [-1.75], int: 3, "int-float": -1.75, float: 4.75, string: 1, datetime: 1, __INDEX__: [2]},
                    {__ROW_PATH__: [-1.5], int: 2, "int-float": -1.5, float: 3.5, string: 1, datetime: 1, __INDEX__: [1]},
                    {__ROW_PATH__: [-1.25], int: 4, "int-float": -1.25, float: 5.25, string: 1, datetime: 1, __INDEX__: [3]},
                    {__ROW_PATH__: [1.75], int: 4, "int-float": 1.75, float: 2.25, string: 1, datetime: 1, __INDEX__: [0]}
                ]);

                view.delete();
                table.delete();
            });

            it("should update on dependent columns, multiply", async function() {
                const table = perspective
                    .table([
                        {int: 1, float: 2.25, string: "a", datetime: new Date()},
                        {int: 2, float: 3.5, string: "b", datetime: new Date()},
                        {int: 3, float: 4.75, string: "c", datetime: new Date()},
                        {int: 4, float: 5.25, string: "d", datetime: new Date()}
                    ])
                    .add_computed([
                        {
                            column: "int * float",
                            computed_function_name: "*",
                            inputs: ["int", "float"]
                        }
                    ]);

                let view = table.view({
                    row_pivots: ["int * float"]
                });

                table.update([{int: 4, __INDEX__: 0}]);

                let json = await view.to_json({
                    index: true
                });

                expect(json).toEqual([
                    {__ROW_PATH__: [], int: 13, "int * float": 51.25, float: 15.75, string: 4, datetime: 4, __INDEX__: [0, 3, 2, 1]},
                    {__ROW_PATH__: [7], int: 2, "int * float": 7, float: 3.5, string: 1, datetime: 1, __INDEX__: [1]},
                    {__ROW_PATH__: [9], int: 4, "int * float": 9, float: 2.25, string: 1, datetime: 1, __INDEX__: [0]},
                    {__ROW_PATH__: [14.25], int: 3, "int * float": 14.25, float: 4.75, string: 1, datetime: 1, __INDEX__: [2]},
                    {__ROW_PATH__: [21], int: 4, "int * float": 21, float: 5.25, string: 1, datetime: 1, __INDEX__: [3]}
                ]);

                view.delete();
                table.delete();
            });

            it("should update on dependent columns, divide", async function() {
                const table = perspective
                    .table([
                        {int: 1, float: 2.25, string: "a", datetime: new Date()},
                        {int: 2, float: 3.5, string: "b", datetime: new Date()},
                        {int: 3, float: 4.75, string: "c", datetime: new Date()},
                        {int: 4, float: 5.25, string: "d", datetime: new Date()}
                    ])
                    .add_computed([
                        {
                            column: "int / float",
                            computed_function_name: "/",
                            inputs: ["int", "float"]
                        }
                    ]);

                let view = table.view({
                    row_pivots: ["int / float"]
                });

                table.update([{int: 4, __INDEX__: 0}]);

                let json = await view.to_json({
                    index: true
                });

                expect(json).toEqual([
                    {__ROW_PATH__: [], int: 13, "int / float": 3.742690058479532, float: 15.75, string: 4, datetime: 4, __INDEX__: [0, 3, 2, 1]},
                    {__ROW_PATH__: [0.5714285714285714], int: 2, "int / float": 0.5714285714285714, float: 3.5, string: 1, datetime: 1, __INDEX__: [1]},
                    {__ROW_PATH__: [0.631578947368421], int: 3, "int / float": 0.631578947368421, float: 4.75, string: 1, datetime: 1, __INDEX__: [2]},
                    {__ROW_PATH__: [0.7619047619047619], int: 4, "int / float": 0.7619047619047619, float: 5.25, string: 1, datetime: 1, __INDEX__: [3]},
                    {__ROW_PATH__: [1.7777777777777777], int: 4, "int / float": 1.7777777777777777, float: 2.25, string: 1, datetime: 1, __INDEX__: [0]}
                ]);

                view.delete();
                table.delete();
            });
        });

        describe("Partial update with null", function() {
            it.skip("Null poison", async function() {
                const table = perspective
                    .table(
                        [
                            {int: 1, float: 2.25, string: "a", datetime: new Date()},
                            {int: 2, float: 3.5, string: "b", datetime: new Date()},
                            {int: 3, float: 4.75, string: "c", datetime: new Date()},
                            {int: 4, float: 5.25, string: "d", datetime: new Date()}
                        ],
                        {index: "int"}
                    )
                    .add_computed([
                        {
                            column: "new",
                            computed_function_name: "+",
                            inputs: ["int", "float"]
                        }
                    ]);

                let view = table.view({columns: ["new", "int", "float"]});

                table.update([{int: 2, float: null}]);

                let result = await view.to_columns();

                expect(result).toEqual({
                    new: [3.25, null, 4.75, 5.25],
                    int: [1, 2, 3, 4],
                    float: [2.25, null, 4.75, 5.25]
                });

                view.delete();
                table.delete();
            });

            it.skip("Null poison, unset", async function() {
                const table = perspective
                    .table(
                        [
                            {int: 1, float: 2.25, string: "a", datetime: new Date()},
                            {int: 2, float: 3.5, string: "b", datetime: new Date()},
                            {int: 3, float: 4.75, string: "c", datetime: new Date()},
                            {int: 4, float: 5.25, string: "d", datetime: new Date()}
                        ],
                        {index: "int"}
                    )
                    .add_computed([
                        {
                            column: "new",
                            computed_function_name: "+",
                            inputs: ["int", "float"]
                        }
                    ]);

                let view = table.view({columns: ["new", "int", "float"]});

                table.update([{int: 2, float: undefined}]);

                let result = await view.to_columns();

                expect(result).toEqual({
                    new: [3.25, null, 4.75, 5.25],
                    int: [1, 2, 3, 4],
                    float: [2.25, null, 4.75, 5.25]
                });

                view.delete();
                table.delete();
            });
        });
    });
};
