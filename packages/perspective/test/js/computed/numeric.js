/******************************************************************************
 *
 * Copyright (c) 2017, the Perspective Authors.
 *
 * This file is part of the Perspective library, distributed under the terms of
 * the Apache License 2.0.  The full license can be found in the LICENSE file.
 *
 */
const common = require("./common.js");

/**
 * Tests the correctness of each numeric computation function in various
 * environments and parameters - different types, nulls, undefined, etc.
 */
module.exports = perspective => {
    describe("Numeric computed columns", function() {
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

        describe("Numeric, arity 2", function() {
            it("Computed column of arity 2, add ints", async function() {
                const table = perspective.table(common.int_float_data);

                const view = table.view({
                    columns: ["sum"],
                    computed_columns: [
                        {
                            column: "sum",
                            computed_function_name: "+",
                            inputs: ["x", "x"]
                        }
                    ]
                });
                let result = await view.to_json();
                expect(result).toEqual([{sum: 2}, {sum: 4}, {sum: 6}, {sum: 8}]);
                view.delete();
                table.delete();
            });

            it("Computed column of arity 2, add floats", async function() {
                const table = perspective.table(common.int_float_data);

                const view = table.view({
                    columns: ["sum"],
                    computed_columns: [
                        {
                            column: "sum",
                            computed_function_name: "+",
                            inputs: ["w", "w"]
                        }
                    ]
                });
                let result = await view.to_json();
                expect(result).toEqual([{sum: 3}, {sum: 5}, {sum: 7}, {sum: 9}]);
                view.delete();
                table.delete();
            });

            it("Computed column of arity 2, add mixed", async function() {
                const table = perspective.table(common.int_float_data);

                const view = table.view({
                    columns: ["sum"],
                    computed_columns: [
                        {
                            column: "sum",
                            computed_function_name: "+",
                            inputs: ["w", "x"]
                        }
                    ]
                });
                let result = await view.to_json();
                expect(result).toEqual([{sum: 2.5}, {sum: 4.5}, {sum: 6.5}, {sum: 8.5}]);
                view.delete();
                table.delete();
            });

            it("Computed column of arity 2, add with null", async function() {
                const table = perspective.table({
                    a: [1, 2, null, 3, 4],
                    b: [1.5, undefined, 2.5, 3.5, 4.5]
                });

                expect(await table.view().to_columns()).toEqual({
                    a: [1, 2, null, 3, 4],
                    b: [1.5, null, 2.5, 3.5, 4.5]
                });

                const view = table.view({
                    columns: ["sum"],
                    computed_columns: [
                        {
                            column: "sum",
                            computed_function_name: "+",
                            inputs: ["a", "b"]
                        }
                    ]
                });
                let result = await view.to_columns();
                expect(result["sum"]).toEqual([2.5, null, null, 6.5, 8.5]);
                view.delete();
                table.delete();
            });

            it("Computed column of arity 2, subtract ints", async function() {
                const table = perspective.table(common.int_float_subtract_data);
                const view = table.view({
                    columns: ["difference"],
                    computed_columns: [
                        {
                            column: "difference",
                            computed_function_name: "-",
                            inputs: ["v", "x"]
                        }
                    ]
                });
                let result = await view.to_json();
                expect(result).toEqual([{difference: 1}, {difference: 1}, {difference: 1}, {difference: 1}]);
                view.delete();

                table.delete();
            });

            it("Computed column of arity 2, subtract floats", async function() {
                const table = perspective.table(common.int_float_subtract_data);
                const view = table.view({
                    columns: ["difference"],
                    computed_columns: [
                        {
                            column: "difference",
                            computed_function_name: "-",
                            inputs: ["u", "w"]
                        }
                    ]
                });
                let result = await view.to_json();
                expect(result).toEqual([{difference: 1}, {difference: 1}, {difference: 1}, {difference: 1}]);
                view.delete();
                table.delete();
            });

            it("Computed column of arity 2, subtract mixed", async function() {
                const table = perspective.table(common.int_float_data);
                const view = table.view({
                    columns: ["difference"],
                    computed_columns: [
                        {
                            column: "difference",
                            computed_function_name: "-",
                            inputs: ["w", "x"]
                        }
                    ]
                });
                let result = await view.to_json();
                expect(result).toEqual([{difference: 0.5}, {difference: 0.5}, {difference: 0.5}, {difference: 0.5}]);
                view.delete();
                table.delete();
            });

            it("Computed column of arity 2, subtract with null", async function() {
                const table = perspective.table({
                    a: [1, 2, null, 3, 4],
                    b: [1.5, undefined, 2.5, 3.5, 4.5]
                });

                expect(await table.view().to_columns()).toEqual({
                    a: [1, 2, null, 3, 4],
                    b: [1.5, null, 2.5, 3.5, 4.5]
                });

                const view = table.view({
                    columns: ["difference"],
                    computed_columns: [
                        {
                            column: "difference",
                            computed_function_name: "-",
                            inputs: ["a", "b"]
                        }
                    ]
                });
                let result = await view.to_columns();
                expect(result["difference"]).toEqual([-0.5, null, null, -0.5, -0.5]);
                view.delete();
                table.delete();
            });

            it("Computed column of arity 2, multiply ints", async function() {
                const table = perspective.table(common.int_float_subtract_data);

                const view = table.view({
                    columns: ["multiply"],
                    computed_columns: [
                        {
                            column: "multiply",
                            computed_function_name: "*",
                            inputs: ["v", "x"]
                        }
                    ]
                });
                let result = await view.to_json();
                expect(result).toEqual([{multiply: 2}, {multiply: 6}, {multiply: 12}, {multiply: 20}]);
                view.delete();
                table.delete();
            });

            it("Computed column of arity 2, multiply floats", async function() {
                const table = perspective.table(common.int_float_subtract_data);

                const view = table.view({
                    columns: ["multiply"],
                    computed_columns: [
                        {
                            column: "multiply",
                            computed_function_name: "*",
                            inputs: ["u", "w"]
                        }
                    ]
                });
                let result = await view.to_json();
                expect(result).toEqual([{multiply: 3.75}, {multiply: 8.75}, {multiply: 15.75}, {multiply: 24.75}]);
                view.delete();

                table.delete();
            });

            it("Computed column of arity 2, multiply mixed", async function() {
                const table = perspective.table(common.int_float_data);

                const view = table.view({
                    columns: ["multiply"],
                    computed_columns: [
                        {
                            column: "multiply",
                            computed_function_name: "*",
                            inputs: ["w", "x"]
                        }
                    ]
                });
                let result = await view.to_json();
                expect(result).toEqual([{multiply: 1.5}, {multiply: 5}, {multiply: 10.5}, {multiply: 18}]);
                view.delete();

                table.delete();
            });

            it("Computed column of arity 2, multiply with null", async function() {
                const table = perspective.table({
                    a: [1, 2, null, 3, 4],
                    b: [1.5, undefined, 2.5, 3.5, 4.5]
                });

                expect(await table.view().to_columns()).toEqual({
                    a: [1, 2, null, 3, 4],
                    b: [1.5, null, 2.5, 3.5, 4.5]
                });

                const view = table.view({
                    columns: ["product"],
                    computed_columns: [
                        {
                            column: "product",
                            computed_function_name: "*",
                            inputs: ["a", "b"]
                        }
                    ]
                });
                let result = await view.to_columns();
                expect(result["product"]).toEqual([1.5, null, null, 10.5, 18]);
                view.delete();

                table.delete();
            });

            it("Computed column of arity 2, divide ints", async function() {
                const table = perspective.table(common.int_float_subtract_data);

                const view = table.view({
                    columns: ["divide"],
                    computed_columns: [
                        {
                            column: "divide",
                            computed_function_name: "/",
                            inputs: ["v", "x"]
                        }
                    ]
                });
                let result = await view.to_json();
                expect(result).toEqual([{divide: 2}, {divide: 1.5}, {divide: 1.3333333333333333}, {divide: 1.25}]);
                view.delete();

                table.delete();
            });

            it("Computed column of arity 2, divide floats", async function() {
                const table = perspective.table(common.int_float_subtract_data);
                const view = table.view({
                    columns: ["divide"],
                    computed_columns: [
                        {
                            column: "divide",
                            computed_function_name: "/",
                            inputs: ["u", "w"]
                        }
                    ]
                });
                let result = await view.to_json();
                expect(result).toEqual([{divide: 1.6666666666666667}, {divide: 1.4}, {divide: 1.2857142857142858}, {divide: 1.2222222222222223}]);
                view.delete();

                table.delete();
            });

            it("Computed column of arity 2, divide mixed", async function() {
                const table = perspective.table(common.int_float_data);
                const view = table.view({
                    columns: ["divide"],
                    computed_columns: [
                        {
                            column: "divide",
                            computed_function_name: "/",
                            inputs: ["w", "x"]
                        }
                    ]
                });
                let result = await view.to_json();
                expect(result).toEqual([{divide: 1.5}, {divide: 1.25}, {divide: 1.1666666666666667}, {divide: 1.125}]);
                view.delete();

                table.delete();
            });

            it("Computed column of arity 2, divide with null", async function() {
                const table = perspective.table({
                    a: [1, 2, null, 3, 4],
                    b: [1.5, undefined, 2.5, 3.5, 4.5]
                });

                expect(await table.view().to_columns()).toEqual({
                    a: [1, 2, null, 3, 4],
                    b: [1.5, null, 2.5, 3.5, 4.5]
                });

                const view = table.view({
                    columns: ["divide"],
                    computed_columns: [
                        {
                            column: "divide",
                            computed_function_name: "/",
                            inputs: ["a", "b"]
                        }
                    ]
                });
                let result = await view.to_columns();
                expect(result["divide"]).toEqual([0.6666666666666666, null, null, 0.8571428571428571, 0.8888888888888888]);
                view.delete();
                table.delete();
            });

            it("Computed column of arity 2, percent a of b, ints", async function() {
                const table = perspective.table({
                    a: [100, 75, 50, 25, 10, 1],
                    b: [100, 100, 100, 100, 100, 100]
                });
                const view = table.view({
                    columns: ["%"],
                    computed_columns: [
                        {
                            column: "%",
                            computed_function_name: "%",
                            inputs: ["a", "b"]
                        }
                    ]
                });
                let result = await view.to_columns();
                expect(result["%"]).toEqual([100, 75, 50, 25, 10, 1]);
                view.delete();
                table.delete();
            });

            it("Computed column of arity 2, percent a of b, floats", async function() {
                const table = perspective.table({
                    a: [7.5, 5.5, 2.5, 1.5, 0.5],
                    b: [22.5, 16.5, 7.5, 4.5, 1.5]
                });
                const view = table.view({
                    columns: ["%"],
                    computed_columns: [
                        {
                            column: "%",
                            computed_function_name: "%",
                            inputs: ["a", "b"]
                        }
                    ]
                });
                let result = await view.to_columns();
                expect(result["%"]).toEqual([33.33333333333333, 33.33333333333333, 33.33333333333333, 33.33333333333333, 33.33333333333333]);
                view.delete();
                table.delete();
            });

            it("Computed column of arity 2, percent a of b, mixed", async function() {
                const table = perspective.table({
                    a: [55.5, 65.5, 75.5, 85.5, 95.5],
                    b: [100, 100, 100, 100, 100]
                });
                const view = table.view({
                    columns: ["%"],
                    computed_columns: [
                        {
                            column: "%",
                            computed_function_name: "%",
                            inputs: ["a", "b"]
                        }
                    ]
                });
                let result = await view.to_columns();
                expect(result["%"]).toEqual([55.50000000000001, 65.5, 75.5, 85.5, 95.5]);
                view.delete();
                table.delete();
            });

            it("Computed column of arity 2, percent a of b, with null", async function() {
                const table = perspective.table({
                    a: [100, null, 50, 25, 10, 1],
                    b: [100, 100, 100, 100, undefined, 100]
                });
                const view = table.view({
                    columns: ["%"],
                    computed_columns: [
                        {
                            column: "%",
                            computed_function_name: "%",
                            inputs: ["a", "b"]
                        }
                    ]
                });
                let result = await view.to_columns();
                expect(result["%"]).toEqual([100, null, 50, 25, null, 1]);
                view.delete();
                table.delete();
            });
        });
    });
};
