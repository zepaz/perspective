/******************************************************************************
 *
 * Copyright (c) 2018, the Perspective Authors.
 *
 * This file is part of the Perspective library, distributed under the terms of
 * the Apache License 2.0.  The full license can be found in the LICENSE file.
 *
 */

import perspective from "@finos/perspective";

import "@finos/perspective-viewer";
import "@finos/perspective-viewer-datagrid";
import "@finos/perspective-viewer-d3fc";

import "@finos/perspective-viewer/dist/umd/material.css";

import "./index.css";

const worker = perspective.shared_worker();

const schema = {
    colA: "integer",
    colB: "datetime"
};

const config = {
    plugin: "datagrid",
    columns: ["colA", "colB", "week_bucket(colB)"],
    "computed-columns": ['week_bucket("colB")']
};

window.addEventListener("load", async () => {
    const viewer = document.createElement("perspective-viewer");
    document.body.append(viewer);

    const table = worker.table(schema);
    viewer.load(table);
    viewer.restore(config);

    let counter = 0;

    const update = () => {
        console.log("updating");
        table.update([{colA: ++counter, colB: new Date()}]);
    };
    setInterval(update, 1000);

    window.viewer = viewer;
});
