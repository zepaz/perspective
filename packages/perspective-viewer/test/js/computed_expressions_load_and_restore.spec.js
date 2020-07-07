/******************************************************************************
 *
 * Copyright (c) 2017, the Perspective Authors.
 *
 * This file is part of the Perspective library, distributed under the terms of
 * the Apache License 2.0.  The full license can be found in the LICENSE file.
 *
 */

const utils = require("@finos/perspective-test");
const path = require("path");

const DATA = {
    a: [1, 2, 3, 4],
    b: [1.5, 2.5, 3.5, 4.5],
    c: ["a", "b", "c", "d"],
    d: [new Date(2020, 7, 11, 12, 30, 45), new Date(2020, 7, 11, 12, 30, 45), new Date(2020, 7, 11, 12, 30, 45), new Date(2020, 7, 11, 12, 30, 45)]
};

/**
 * Use `xpath` to get an attribute without using `page.evaluate`, adapted from
 * https://github.com/puppeteer/puppeteer/issues/3786#issuecomment-454928600.
 *
 * @param {String} xpath an xpath to an element's `@attribute`
 */
const get_element_attribute = async (page, xpath) => {
    const [attr] = await page.$x(xpath);
    const property = await attr.getProperty("value");
    return property.jsonValue();
};

/**
 * Test out the interactions between `load`, `restore`, and computed columns.
 */
utils.with_server({}, () => {
    describe.page(
        "blank.html",
        () => {
            // Load first, then restore
            test.capture(
                "Load and restore promise",
                async page => {
                    const viewer = await page.$("perspective-viewer");

                    await page.evaluate(
                        (viewer, data) => {
                            viewer.load(data).then(() => {
                                const config = {
                                    "computed-columns": ['day_of_week("d")', '"a" + "b"', 'uppercase("c")']
                                };
                                viewer.restore(config);
                            });
                        },
                        viewer,
                        DATA
                    );

                    await page.waitForSelector("perspective-viewer:not([updating])");
                    await page.shadow_click("perspective-viewer", "#config_button");

                    // make sure the attributes are correct
                    const computed = await get_element_attribute(page, ".//perspective-viewer/@computed-columns");
                    expect(JSON.parse(computed)).toEqual(['day_of_week("d")', '"a" + "b"', 'uppercase("c")']);

                    const parsed_computed = await get_element_attribute(page, ".//perspective-viewer/@parsed-computed-columns");
                    expect(JSON.parse(parsed_computed)).toEqual([
                        {
                            column: "day_of_week(d)",
                            inputs: ["d"],
                            computed_function_name: "day_of_week"
                        },
                        {
                            column: "(a + b)",
                            inputs: ["a", "b"],
                            computed_function_name: "+"
                        },
                        {
                            column: "uppercase(c)",
                            inputs: ["c"],
                            computed_function_name: "uppercase"
                        }
                    ]);
                },
                {wait_for_update: false}
            );

            test.capture(
                "Load and restore async",
                async page => {
                    const viewer = await page.$("perspective-viewer");
                    await page.evaluate(
                        (viewer, data) => {
                            viewer.load(data);
                            const config = {
                                "computed-columns": ['day_of_week("d")', '"a" + "b"', 'uppercase("c")']
                            };
                            viewer.restore(config);
                        },
                        viewer,
                        DATA
                    );
                    await page.waitForSelector("perspective-viewer:not([updating])");
                    await page.shadow_click("perspective-viewer", "#config_button");

                    const computed = await get_element_attribute(page, ".//perspective-viewer/@computed-columns");
                    expect(JSON.parse(computed)).toEqual(['day_of_week("d")', '"a" + "b"', 'uppercase("c")']);

                    const parsed_computed = await get_element_attribute(page, ".//perspective-viewer/@parsed-computed-columns");
                    expect(JSON.parse(parsed_computed)).toEqual([
                        {
                            column: "day_of_week(d)",
                            inputs: ["d"],
                            computed_function_name: "day_of_week"
                        },
                        {
                            column: "(a + b)",
                            inputs: ["a", "b"],
                            computed_function_name: "+"
                        },
                        {
                            column: "uppercase(c)",
                            inputs: ["c"],
                            computed_function_name: "uppercase"
                        }
                    ]);
                },
                {wait_for_update: false}
            );

            // Restore first, then load

            test.capture(
                "Restore then load async",
                async page => {
                    const viewer = await page.$("perspective-viewer");
                    await page.evaluate(
                        (viewer, data) => {
                            const config = {
                                "computed-columns": ['day_of_week("d")', '"a" + "b"', 'uppercase("c")']
                            };
                            viewer.restore(config);
                            viewer.load(data);
                        },
                        viewer,
                        DATA
                    );
                    await page.waitForSelector("perspective-viewer:not([updating])");
                    await page.shadow_click("perspective-viewer", "#config_button");

                    const computed = await get_element_attribute(page, ".//perspective-viewer/@computed-columns");
                    expect(JSON.parse(computed)).toEqual(['day_of_week("d")', '"a" + "b"', 'uppercase("c")']);

                    const parsed_computed = await get_element_attribute(page, ".//perspective-viewer/@parsed-computed-columns");
                    expect(JSON.parse(parsed_computed)).toEqual([
                        {
                            column: "day_of_week(d)",
                            inputs: ["d"],
                            computed_function_name: "day_of_week"
                        },
                        {
                            column: "(a + b)",
                            inputs: ["a", "b"],
                            computed_function_name: "+"
                        },
                        {
                            column: "uppercase(c)",
                            inputs: ["c"],
                            computed_function_name: "uppercase"
                        }
                    ]);
                },
                {wait_for_update: false}
            );

            test.capture(
                "Restore then load promise",
                async page => {
                    const viewer = await page.$("perspective-viewer");
                    await page.evaluate(
                        (viewer, data) => {
                            const config = {
                                "computed-columns": ['day_of_week("d")', '"a" + "b"', 'uppercase("c")']
                            };
                            viewer.restore(config).then(() => {
                                viewer.load(data);
                            });
                        },
                        viewer,
                        DATA
                    );
                    await page.waitForSelector("perspective-viewer:not([updating])");
                    await page.shadow_click("perspective-viewer", "#config_button");

                    const computed = await get_element_attribute(page, ".//perspective-viewer/@computed-columns");
                    expect(JSON.parse(computed)).toEqual(['day_of_week("d")', '"a" + "b"', 'uppercase("c")']);

                    const parsed_computed = await get_element_attribute(page, ".//perspective-viewer/@parsed-computed-columns");
                    expect(JSON.parse(parsed_computed)).toEqual([
                        {
                            column: "day_of_week(d)",
                            inputs: ["d"],
                            computed_function_name: "day_of_week"
                        },
                        {
                            column: "(a + b)",
                            inputs: ["a", "b"],
                            computed_function_name: "+"
                        },
                        {
                            column: "uppercase(c)",
                            inputs: ["c"],
                            computed_function_name: "uppercase"
                        }
                    ]);
                },
                {wait_for_update: false}
            );

            // Load, then restore, computed columns are active

            test.capture(
                "Load and restore with active computed promise",
                async page => {
                    const viewer = await page.$("perspective-viewer");

                    await page.evaluate(
                        (viewer, data) => {
                            viewer.load(data).then(() => {
                                const config = {
                                    columns: ["(a + b)", "day_of_week(d)"],
                                    "row-pivots": ["uppercase(c)"],
                                    "computed-columns": ['day_of_week("d")', '"a" + "b"', 'uppercase("c")']
                                };
                                viewer.restore(config);
                            });
                        },
                        viewer,
                        DATA
                    );

                    await page.waitForSelector("perspective-viewer:not([updating])");
                    await page.shadow_click("perspective-viewer", "#config_button");

                    // make sure the attributes are correct
                    const computed = await get_element_attribute(page, ".//perspective-viewer/@computed-columns");
                    expect(JSON.parse(computed)).toEqual(['day_of_week("d")', '"a" + "b"', 'uppercase("c")']);

                    const parsed_computed = await get_element_attribute(page, ".//perspective-viewer/@parsed-computed-columns");
                    expect(JSON.parse(parsed_computed)).toEqual([
                        {
                            column: "day_of_week(d)",
                            inputs: ["d"],
                            computed_function_name: "day_of_week"
                        },
                        {
                            column: "(a + b)",
                            inputs: ["a", "b"],
                            computed_function_name: "+"
                        },
                        {
                            column: "uppercase(c)",
                            inputs: ["c"],
                            computed_function_name: "uppercase"
                        }
                    ]);
                },
                {wait_for_update: false}
            );

            test.capture(
                "Load and restore with active computed async",
                async page => {
                    const viewer = await page.$("perspective-viewer");
                    await page.evaluate(
                        (viewer, data) => {
                            viewer.load(data);
                            const config = {
                                columns: ["(a + b)", "day_of_week(d)"],
                                "row-pivots": ["uppercase(c)"],
                                "computed-columns": ['day_of_week("d")', '"a" + "b"', 'uppercase("c")']
                            };
                            viewer.restore(config);
                        },
                        viewer,
                        DATA
                    );
                    await page.waitForSelector("perspective-viewer:not([updating])");
                    await page.shadow_click("perspective-viewer", "#config_button");

                    const computed = await get_element_attribute(page, ".//perspective-viewer/@computed-columns");
                    expect(JSON.parse(computed)).toEqual(['day_of_week("d")', '"a" + "b"', 'uppercase("c")']);

                    const parsed_computed = await get_element_attribute(page, ".//perspective-viewer/@parsed-computed-columns");
                    expect(JSON.parse(parsed_computed)).toEqual([
                        {
                            column: "day_of_week(d)",
                            inputs: ["d"],
                            computed_function_name: "day_of_week"
                        },
                        {
                            column: "(a + b)",
                            inputs: ["a", "b"],
                            computed_function_name: "+"
                        },
                        {
                            column: "uppercase(c)",
                            inputs: ["c"],
                            computed_function_name: "uppercase"
                        }
                    ]);
                },
                {wait_for_update: false}
            );

            // Restore then load, computed is active in config

            test.capture(
                "Restore then load with active computed async",
                async page => {
                    const viewer = await page.$("perspective-viewer");
                    await page.evaluate(
                        (viewer, data) => {
                            const config = {
                                columns: ["(a + b)", "day_of_week(d)"],
                                "row-pivots": ["uppercase(c)"],
                                "computed-columns": ['day_of_week("d")', '"a" + "b"', 'uppercase("c")']
                            };
                            viewer.restore(config);
                            viewer.load(data);
                        },
                        viewer,
                        DATA
                    );
                    await page.waitForSelector("perspective-viewer:not([updating])");
                    await page.shadow_click("perspective-viewer", "#config_button");

                    const computed = await get_element_attribute(page, ".//perspective-viewer/@computed-columns");
                    expect(JSON.parse(computed)).toEqual(['day_of_week("d")', '"a" + "b"', 'uppercase("c")']);

                    const parsed_computed = await get_element_attribute(page, ".//perspective-viewer/@parsed-computed-columns");
                    expect(JSON.parse(parsed_computed)).toEqual([
                        {
                            column: "day_of_week(d)",
                            inputs: ["d"],
                            computed_function_name: "day_of_week"
                        },
                        {
                            column: "(a + b)",
                            inputs: ["a", "b"],
                            computed_function_name: "+"
                        },
                        {
                            column: "uppercase(c)",
                            inputs: ["c"],
                            computed_function_name: "uppercase"
                        }
                    ]);
                },
                {wait_for_update: false}
            );

            test.capture(
                "Restore then load with active computed promise",
                async page => {
                    const viewer = await page.$("perspective-viewer");
                    await page.evaluate(
                        (viewer, data) => {
                            const config = {
                                columns: ["(a + b)", "day_of_week(d)"],
                                "row-pivots": ["uppercase(c)"],
                                "computed-columns": ['day_of_week("d")', '"a" + "b"', 'uppercase("c")']
                            };
                            viewer.restore(config).then(() => {
                                viewer.load(data);
                            });
                        },
                        viewer,
                        DATA
                    );
                    await page.waitForSelector("perspective-viewer:not([updating])");
                    await page.shadow_click("perspective-viewer", "#config_button");

                    const computed = await get_element_attribute(page, ".//perspective-viewer/@computed-columns");
                    expect(JSON.parse(computed)).toEqual(['day_of_week("d")', '"a" + "b"', 'uppercase("c")']);

                    const parsed_computed = await get_element_attribute(page, ".//perspective-viewer/@parsed-computed-columns");
                    expect(JSON.parse(parsed_computed)).toEqual([
                        {
                            column: "day_of_week(d)",
                            inputs: ["d"],
                            computed_function_name: "day_of_week"
                        },
                        {
                            column: "(a + b)",
                            inputs: ["a", "b"],
                            computed_function_name: "+"
                        },
                        {
                            column: "uppercase(c)",
                            inputs: ["c"],
                            computed_function_name: "uppercase"
                        }
                    ]);
                },
                {wait_for_update: false}
            );

            // Load and restore with dependents

            test.capture(
                "Load and restore with dependents promise",
                async page => {
                    // ac38a3596af405de6b95f1d5f47076c5
                    // 08c3e3b52637067a5f11510227aa2238
                    const viewer = await page.$("perspective-viewer");
                    await page.evaluate(
                        (viewer, data) => {
                            viewer.load(data).then(() => {
                                const config = {
                                    "computed-columns": ['sqrt("a") / abs("b") ^ "a" + "a" * "b"']
                                };
                                viewer.restore(config);
                            });
                        },
                        viewer,
                        DATA
                    );
                    await page.waitForSelector("perspective-viewer:not([updating])");
                    await page.shadow_click("perspective-viewer", "#config_button");

                    const computed = await get_element_attribute(page, ".//perspective-viewer/@computed-columns");
                    expect(JSON.parse(computed)).toEqual(['sqrt("a") / abs("b") ^ "a" + "a" * "b"']);

                    const parsed_computed = await get_element_attribute(page, ".//perspective-viewer/@parsed-computed-columns");
                    expect(JSON.parse(parsed_computed)).toEqual([
                        {
                            column: "sqrt(a)",
                            inputs: ["a"],
                            computed_function_name: "sqrt"
                        },
                        {
                            column: "abs(b)",
                            inputs: ["b"],
                            computed_function_name: "abs"
                        },
                        {
                            column: "(abs(b) ^ a)",
                            inputs: ["abs(b)", "a"],
                            computed_function_name: "^"
                        },
                        {
                            column: "(sqrt(a) / (abs(b) ^ a))",
                            inputs: ["sqrt(a)", "(abs(b) ^ a)"],
                            computed_function_name: "/"
                        },
                        {
                            column: "(a * b)",
                            inputs: ["a", "b"],
                            computed_function_name: "*"
                        },
                        {
                            column: "((sqrt(a) / (abs(b) ^ a)) + (a * b))",
                            inputs: ["(sqrt(a) / (abs(b) ^ a))", "(a * b)"],
                            computed_function_name: "+"
                        }
                    ]);
                },
                {wait_for_update: false}
            );

            test.capture(
                "Load and restore with dependents async",
                async page => {
                    const viewer = await page.$("perspective-viewer");
                    await page.evaluate(
                        (viewer, data) => {
                            viewer.load(data);
                            const config = {
                                "computed-columns": ['sqrt("a") / abs("b") ^ "a" + "a" * "b"']
                            };
                            viewer.restore(config);
                        },
                        viewer,
                        DATA
                    );
                    await page.waitForSelector("perspective-viewer:not([updating])");
                    await page.shadow_click("perspective-viewer", "#config_button");

                    const computed = await get_element_attribute(page, ".//perspective-viewer/@computed-columns");
                    expect(JSON.parse(computed)).toEqual(['sqrt("a") / abs("b") ^ "a" + "a" * "b"']);

                    const parsed_computed = await get_element_attribute(page, ".//perspective-viewer/@parsed-computed-columns");
                    expect(JSON.parse(parsed_computed)).toEqual([
                        {
                            column: "sqrt(a)",
                            inputs: ["a"],
                            computed_function_name: "sqrt"
                        },
                        {
                            column: "abs(b)",
                            inputs: ["b"],
                            computed_function_name: "abs"
                        },
                        {
                            column: "(abs(b) ^ a)",
                            inputs: ["abs(b)", "a"],
                            computed_function_name: "^"
                        },
                        {
                            column: "(sqrt(a) / (abs(b) ^ a))",
                            inputs: ["sqrt(a)", "(abs(b) ^ a)"],
                            computed_function_name: "/"
                        },
                        {
                            column: "(a * b)",
                            inputs: ["a", "b"],
                            computed_function_name: "*"
                        },
                        {
                            column: "((sqrt(a) / (abs(b) ^ a)) + (a * b))",
                            inputs: ["(sqrt(a) / (abs(b) ^ a))", "(a * b)"],
                            computed_function_name: "+"
                        }
                    ]);
                },
                {wait_for_update: false}
            );

            // Restore then load with dependents

            test.capture(
                "Restore then load with dependents promise",
                async page => {
                    const viewer = await page.$("perspective-viewer");
                    await page.evaluate(
                        (viewer, data) => {
                            const config = {
                                "computed-columns": ['sqrt("a") / abs("b") ^ "a" + "a" * "b"']
                            };
                            viewer.restore(config).then(() => {
                                viewer.load(data);
                            });
                        },
                        viewer,
                        DATA
                    );
                    await page.waitForSelector("perspective-viewer:not([updating])");
                    await page.shadow_click("perspective-viewer", "#config_button");

                    const computed = await get_element_attribute(page, ".//perspective-viewer/@computed-columns");
                    expect(JSON.parse(computed)).toEqual(['sqrt("a") / abs("b") ^ "a" + "a" * "b"']);

                    const parsed_computed = await get_element_attribute(page, ".//perspective-viewer/@parsed-computed-columns");
                    expect(JSON.parse(parsed_computed)).toEqual([
                        {
                            column: "sqrt(a)",
                            inputs: ["a"],
                            computed_function_name: "sqrt"
                        },
                        {
                            column: "abs(b)",
                            inputs: ["b"],
                            computed_function_name: "abs"
                        },
                        {
                            column: "(abs(b) ^ a)",
                            inputs: ["abs(b)", "a"],
                            computed_function_name: "^"
                        },
                        {
                            column: "(sqrt(a) / (abs(b) ^ a))",
                            inputs: ["sqrt(a)", "(abs(b) ^ a)"],
                            computed_function_name: "/"
                        },
                        {
                            column: "(a * b)",
                            inputs: ["a", "b"],
                            computed_function_name: "*"
                        },
                        {
                            column: "((sqrt(a) / (abs(b) ^ a)) + (a * b))",
                            inputs: ["(sqrt(a) / (abs(b) ^ a))", "(a * b)"],
                            computed_function_name: "+"
                        }
                    ]);
                },
                {wait_for_update: false}
            );

            test.capture(
                "Restore then load with dependents async",
                async page => {
                    const viewer = await page.$("perspective-viewer");
                    await page.evaluate(
                        (viewer, data) => {
                            const config = {
                                "computed-columns": ['sqrt("a") / abs("b") ^ "a" + "a" * "b"']
                            };
                            viewer.restore(config);
                            viewer.load(data);
                        },
                        viewer,
                        DATA
                    );
                    await page.waitForSelector("perspective-viewer:not([updating])");
                    await page.shadow_click("perspective-viewer", "#config_button");

                    const computed = await get_element_attribute(page, ".//perspective-viewer/@computed-columns");
                    expect(JSON.parse(computed)).toEqual(['sqrt("a") / abs("b") ^ "a" + "a" * "b"']);

                    const parsed_computed = await get_element_attribute(page, ".//perspective-viewer/@parsed-computed-columns");
                    expect(JSON.parse(parsed_computed)).toEqual([
                        {
                            column: "sqrt(a)",
                            inputs: ["a"],
                            computed_function_name: "sqrt"
                        },
                        {
                            column: "abs(b)",
                            inputs: ["b"],
                            computed_function_name: "abs"
                        },
                        {
                            column: "(abs(b) ^ a)",
                            inputs: ["abs(b)", "a"],
                            computed_function_name: "^"
                        },
                        {
                            column: "(sqrt(a) / (abs(b) ^ a))",
                            inputs: ["sqrt(a)", "(abs(b) ^ a)"],
                            computed_function_name: "/"
                        },
                        {
                            column: "(a * b)",
                            inputs: ["a", "b"],
                            computed_function_name: "*"
                        },
                        {
                            column: "((sqrt(a) / (abs(b) ^ a)) + (a * b))",
                            inputs: ["(sqrt(a) / (abs(b) ^ a))", "(a * b)"],
                            computed_function_name: "+"
                        }
                    ]);
                },
                {wait_for_update: false}
            );

            // Load and restore with dependents, active computed columns

            test.capture(
                "Load and restore with dependents with active computed promise",
                async page => {
                    const viewer = await page.$("perspective-viewer");
                    await page.evaluate(
                        (viewer, data) => {
                            viewer.load(data).then(() => {
                                const config = {
                                    columns: ["((sqrt(a) / (abs(b) ^ a)) + (a * b))", "(a * b)", "(abs(b) ^ a)"],
                                    "column-pivots": ["(sqrt(a) / (abs(b) ^ a))"],
                                    "computed-columns": ['sqrt("a") / abs("b") ^ "a" + "a" * "b"']
                                };
                                viewer.restore(config);
                            });
                        },
                        viewer,
                        DATA
                    );
                    await page.waitForSelector("perspective-viewer:not([updating])");
                    await page.shadow_click("perspective-viewer", "#config_button");

                    const computed = await get_element_attribute(page, ".//perspective-viewer/@computed-columns");
                    expect(JSON.parse(computed)).toEqual(['sqrt("a") / abs("b") ^ "a" + "a" * "b"']);

                    const parsed_computed = await get_element_attribute(page, ".//perspective-viewer/@parsed-computed-columns");
                    expect(JSON.parse(parsed_computed)).toEqual([
                        {
                            column: "sqrt(a)",
                            inputs: ["a"],
                            computed_function_name: "sqrt"
                        },
                        {
                            column: "abs(b)",
                            inputs: ["b"],
                            computed_function_name: "abs"
                        },
                        {
                            column: "(abs(b) ^ a)",
                            inputs: ["abs(b)", "a"],
                            computed_function_name: "^"
                        },
                        {
                            column: "(sqrt(a) / (abs(b) ^ a))",
                            inputs: ["sqrt(a)", "(abs(b) ^ a)"],
                            computed_function_name: "/"
                        },
                        {
                            column: "(a * b)",
                            inputs: ["a", "b"],
                            computed_function_name: "*"
                        },
                        {
                            column: "((sqrt(a) / (abs(b) ^ a)) + (a * b))",
                            inputs: ["(sqrt(a) / (abs(b) ^ a))", "(a * b)"],
                            computed_function_name: "+"
                        }
                    ]);
                },
                {wait_for_update: false}
            );

            test.capture(
                "Load and restore with dependents with active computed async",
                async page => {
                    const viewer = await page.$("perspective-viewer");
                    await page.evaluate(
                        (viewer, data) => {
                            viewer.load(data);
                            const config = {
                                columns: ["((sqrt(a) / (abs(b) ^ a)) + (a * b))", "(a * b)", "(abs(b) ^ a)"],
                                "column-pivots": ["(sqrt(a) / (abs(b) ^ a))"],
                                "computed-columns": ['sqrt("a") / abs("b") ^ "a" + "a" * "b"']
                            };
                            viewer.restore(config);
                        },
                        viewer,
                        DATA
                    );
                    await page.waitForSelector("perspective-viewer:not([updating])");
                    await page.shadow_click("perspective-viewer", "#config_button");

                    const computed = await get_element_attribute(page, ".//perspective-viewer/@computed-columns");
                    expect(JSON.parse(computed)).toEqual(['sqrt("a") / abs("b") ^ "a" + "a" * "b"']);

                    const parsed_computed = await get_element_attribute(page, ".//perspective-viewer/@parsed-computed-columns");
                    expect(JSON.parse(parsed_computed)).toEqual([
                        {
                            column: "sqrt(a)",
                            inputs: ["a"],
                            computed_function_name: "sqrt"
                        },
                        {
                            column: "abs(b)",
                            inputs: ["b"],
                            computed_function_name: "abs"
                        },
                        {
                            column: "(abs(b) ^ a)",
                            inputs: ["abs(b)", "a"],
                            computed_function_name: "^"
                        },
                        {
                            column: "(sqrt(a) / (abs(b) ^ a))",
                            inputs: ["sqrt(a)", "(abs(b) ^ a)"],
                            computed_function_name: "/"
                        },
                        {
                            column: "(a * b)",
                            inputs: ["a", "b"],
                            computed_function_name: "*"
                        },
                        {
                            column: "((sqrt(a) / (abs(b) ^ a)) + (a * b))",
                            inputs: ["(sqrt(a) / (abs(b) ^ a))", "(a * b)"],
                            computed_function_name: "+"
                        }
                    ]);
                },
                {wait_for_update: false}
            );

            // Computed columns should be cleared if a new dataset is restored

            test.capture(
                "Load and restore, then restore new columns",
                async page => {
                    const viewer = await page.$("perspective-viewer");
                    await page.evaluate(
                        (viewer, data) => {
                            viewer.load(data);
                            const config = {
                                columns: ["((sqrt(a) / (abs(b) ^ a)) + (a * b))", "(a * b)", "(abs(b) ^ a)"],
                                "column-pivots": ["(sqrt(a) / (abs(b) ^ a))"],
                                "computed-columns": ['sqrt("a") / abs("b") ^ "a" + "a" * "b"']
                            };
                            viewer.restore(config);
                        },
                        viewer,
                        DATA
                    );
                    await page.waitForSelector("perspective-viewer:not([updating])");
                    await page.shadow_click("perspective-viewer", "#config_button");

                    const computed = await get_element_attribute(page, ".//perspective-viewer/@computed-columns");
                    expect(JSON.parse(computed)).toEqual(['sqrt("a") / abs("b") ^ "a" + "a" * "b"']);

                    const parsed_computed = await get_element_attribute(page, ".//perspective-viewer/@parsed-computed-columns");
                    expect(JSON.parse(parsed_computed)).toEqual([
                        {
                            column: "sqrt(a)",
                            inputs: ["a"],
                            computed_function_name: "sqrt"
                        },
                        {
                            column: "abs(b)",
                            inputs: ["b"],
                            computed_function_name: "abs"
                        },
                        {
                            column: "(abs(b) ^ a)",
                            inputs: ["abs(b)", "a"],
                            computed_function_name: "^"
                        },
                        {
                            column: "(sqrt(a) / (abs(b) ^ a))",
                            inputs: ["sqrt(a)", "(abs(b) ^ a)"],
                            computed_function_name: "/"
                        },
                        {
                            column: "(a * b)",
                            inputs: ["a", "b"],
                            computed_function_name: "*"
                        },
                        {
                            column: "((sqrt(a) / (abs(b) ^ a)) + (a * b))",
                            inputs: ["(sqrt(a) / (abs(b) ^ a))", "(a * b)"],
                            computed_function_name: "+"
                        }
                    ]);

                    // do a second restore
                    await page.evaluate(viewer => {
                        const config = {
                            columns: ["(a + b)", "day_of_week(d)"],
                            "row-pivots": ["uppercase(c)"],
                            "computed-columns": ['day_of_week("d")', '"a" + "b"', 'uppercase("c")']
                        };
                        viewer.restore(config);
                    }, viewer);

                    const new_computed = await get_element_attribute(page, ".//perspective-viewer/@computed-columns");
                    expect(JSON.parse(new_computed)).toEqual(['day_of_week("d")', '"a" + "b"', 'uppercase("c")']);

                    const new_parsed = await get_element_attribute(page, ".//perspective-viewer/@parsed-computed-columns");
                    expect(JSON.parse(new_parsed)).toEqual([
                        {
                            column: "day_of_week(d)",
                            inputs: ["d"],
                            computed_function_name: "day_of_week"
                        },
                        {
                            column: "(a + b)",
                            inputs: ["a", "b"],
                            computed_function_name: "+"
                        },
                        {
                            column: "uppercase(c)",
                            inputs: ["c"],
                            computed_function_name: "uppercase"
                        }
                    ]);
                },
                {wait_for_update: false}
            );
        },
        {
            root: path.join(__dirname, "..", ".."),
            name: "Computed Expressions Load and Restore"
        }
    );
});
