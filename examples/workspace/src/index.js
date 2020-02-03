/******************************************************************************
 *
 * Copyright (c) 2018, the Perspective Authors.
 *
 * This file is part of the Perspective library, distributed under the terms of
 * the Apache License 2.0.  The full license can be found in the LICENSE file.
 *
 */

import perspective from "@finos/perspective";
import "@finos/perspective-workspace";

import "@finos/perspective-viewer-hypergrid";
import "@finos/perspective-viewer-d3fc";

import "./index.less";

const datasource = async () => {
    const req = fetch("./superstore.arrow");
    const resp = await req;
    const buffer = await resp.arrayBuffer();
    const worker = perspective.shared_worker();
    return worker.table(buffer);
};

window.addEventListener("load", () => {
    const workspace = document.createElement("perspective-workspace");
    document.body.append(workspace);
    workspace.tables.set("superstore", datasource());

    for (const name of ["One", "Two", "Three"]) {
        const viewer = document.createElement("perspective-viewer");
        viewer.setAttribute("slot", name);
        viewer.setAttribute("table", "superstore");
        viewer.setAttribute("name", `Test Widget ${name}`);
        workspace.appendChild(viewer);
    }

    workspace.restore({
        master: {
            widgets: ["Three", "Four"]
        },
        detail: {
            main: {
                currentIndex: 0,
                type: "tab-area",
                widgets: ["One", "Two"]
            }
        },
        viewers: {
            Three: {table: "superstore", name: "Test Widget III (modified)", "row-pivots": ["State"], columns: ["Sales", "Profit"]},
            Four: {table: "superstore", name: "Test Widget IV (modified)", "row-pivots": ["Category", "Sub-Category"], columns: ["Sales", "Profit"]}
        }
    });
});
