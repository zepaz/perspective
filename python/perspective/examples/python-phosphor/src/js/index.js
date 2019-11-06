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
    //const worker = perspective.worker();
    //worker.initialize_profile_thread();

    //const view = websocket.open_view("data_source_one");

    // Table created in JS from datafeed in python
    const table = websocket.open_table("data_source_one");
    const workspace = new PerspectiveWorkspace();

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
            bid: "last",
            ask: "last"
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
        plugin: "grid",
        sort: [["lastUpdate", "desc"]]
    });

    workspace.addViewer(widget1);
    workspace.addViewer(widget2, {mode: "split-bottom", ref: widget1});
    workspace.addViewer(widget3, {mode: "split-right", ref: widget1});
    workspace.addViewer(widget4, {mode: "split-right", ref: widget3});

    Widget.attach(workspace, document.body);

    widget1.load(table);
    widget2.load(table);
    widget3.load(table);
    widget4.load(table);

    window.onresize = () => {
        workspace.update();
    };

    window.workspace = workspace;
});
