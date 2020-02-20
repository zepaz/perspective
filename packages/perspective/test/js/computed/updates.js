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
 * Tests the correctness of updates on Tables with computed columns created
 * through `View`, including partial updates, appends, and removes.
 */
module.exports = perspective => {
    describe("Computed updates", function() {
        it("Computed column of arity 2 with updates on non-dependent columns, construct from schema", async function() {
            var meta = {
                w: "float",
                x: "float",
                y: "string",
                z: "boolean"
            };
            const table = perspective.table(meta, {index: "y"});
            const view = table.view({
                computed_columns: [
                    {
                        column: "ratio",
                        computed_function_name: "/",
                        inputs: ["w", "x"]
                    }
                ]
            });

            table.update(common.int_float_common.data);

            let delta_upd = [
                {y: "a", z: false},
                {y: "b", z: true},
                {y: "c", z: false},
                {y: "d", z: true}
            ];
            table.update(delta_upd);
            let result = await view.to_json();
            let expected = [
                {y: "a", ratio: 1.5},
                {y: "b", ratio: 1.25},
                {y: "c", ratio: 1.1666666666666667},
                {y: "d", ratio: 1.125}
            ];
            expect(result).toEqual(expected);
            view.delete();

            table.delete();
        });
    });
};
