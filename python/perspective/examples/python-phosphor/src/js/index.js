/******************************************************************************
 *
 * Copyright (c) 2018, the Perspective Authors.
 *
 * This file is part of the Perspective library, distributed under the terms of
 * the Apache License 2.0.  The full license can be found in the LICENSE file.
 *
 */

import perspective from "@finos/perspective";
import {PerspectiveWorkspace, PerspectiveWidget} from "@finos/perspective-phosphor";
import {Widget} from "@phosphor/widgets";
import "@finos/perspective-phosphor/src/theme/material/index.less";

import "@finos/perspective-viewer-hypergrid";
import "@finos/perspective-viewer-d3fc";

import "./style/index.less";

window.addEventListener("load", async () => {
    // Create a client that expects a Perspective server to accept connections at the specified URL.
    const websocket = perspective.websocket("ws://localhost:3001/websocket");

    /**
     * `table` is a proxy for the `Table` we created on the server.
     *
     * All operations that are possible through the Javascript API are possible on the Python API as well,
     * thus calling `view()`, `schema()`, `update()` etc on `const table` will pass those operations to the
     * Python `Table`, execute the commands, and return the result back to Javascript.
     */
    const table = websocket.open_table("data_source_one");

    const workspace = new PerspectiveWorkspace();

    /**
     * Each `PerspectiveWidget` requires a title and takes an optional config object consisting of
     * `perspective-viewer` options.
    const widget1 = new PerspectiveWidget("Spread", {
        editable: true,
        plugin: "d3_y_line",
        "row-pivots": ["client"],
        "column-pivots": ["name"],
        columns: ["spread"],
        aggregates: {
            bid: "avg",
            ask: "avg",
            spread: "avg"
        }
    });

    const widget2 = new PerspectiveWidget("Bid/Ask", {
        editable: true,
        plugin: "d3_y_bar",
        "row-pivots": ["name"],
        columns: ["bid", "ask"],
        aggregates: {
            bid: "avg",
            ask: "avg"
        }
    });

    const widget3 = new PerspectiveWidget("Client Volume", {
        editable: true,
        plugin: "d3_y_bar",
        columns: ["vol"],
        "row-pivots": ["client"],
        sort: [["vol", "desc"]]
    });

    const widget4 = new PerspectiveWidget("Four", {
        editable: true,
        sort: [["lastUpdate", "desc"]]
    });
    */

    const widget1 = new PerspectiveWidget("Profits", {
        editable: true,
        plugin: "d3_heatmap",
        "row-pivots": ["State"],
        columns: ["Profit"],
        sort: [["Profit", "desc"]]
    });

    const widget2 = new PerspectiveWidget("Sales", {
        editable: true,
        plugin: "d3_y_bar",
        "row-pivots": ["City", "Sub-Category"],
        columns: ["Sales"],
        sort: [["City", "asc"]],
        filters: [["City", "contains", "fort"], ["Sales", ">", 5000]]
    });

    const widget3 = new PerspectiveWidget("Blotter", {
        editable: true,
        plugin: "grid"
    });

    workspace.addViewer(widget1);
    workspace.addViewer(widget2, {mode: "split-bottom", ref: widget1});
    workspace.addViewer(widget3, {mode: "split-right", ref: widget1});

    Widget.attach(workspace, document.body);

    widget1.load(table);
    widget2.load(table);
    widget3.load(table);

    window.onresize = () => {
        workspace.update();
    };

    window.workspace = workspace;
});
