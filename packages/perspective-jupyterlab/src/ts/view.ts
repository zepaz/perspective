/******************************************************************************
 *
 * Copyright (c) 2019, the Perspective Authors.
 *
 * This file is part of the Perspective library, distributed under the terms of
 * the Apache License 2.0.  The full license can be found in the LICENSE file.
 *
 */
/* eslint-disable @typescript-eslint/camelcase */
import {isEqual} from "underscore";
import {DOMWidgetView} from "@jupyter-widgets/base";
import {PerspectiveWorker, Table, View} from "@finos/perspective";

import {PerspectiveJupyterWidget} from "./widget";
import {PerspectiveJupyterClient, PerspectiveJupyterMessage} from "./client";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const perspective = require("@finos/perspective");

/**
 * `PerspectiveView` defines the plugin's DOM and how the plugin interacts with
 * the DOM.
 */
export class PerspectiveView extends DOMWidgetView {
    pWidget: PerspectiveJupyterWidget; // this should be pWidget, but temporarily calling it pWidget for widgets incompatibilities
    perspective_client: PerspectiveJupyterClient;

    // The message ID that is expecting a binary as a follow-up message.
    _pending_binary: number;

    // if there is a port_id, join it with the pending binary so on_update
    // callbacks work correctly
    _pending_port_id: number;

    _createElement(tagName: string): HTMLElement {
        this.pWidget = new PerspectiveJupyterWidget(undefined, {
            plugin: this.model.get("plugin"),
            columns: this.model.get("columns"),
            row_pivots: this.model.get("row_pivots"),
            column_pivots: this.model.get("column_pivots"),
            aggregates: this.model.get("aggregates"),
            sort: this.model.get("sort"),
            filters: this.model.get("filters"),
            computed_columns: this.model.get("computed_columns"),
            plugin_config: this.model.get("plugin_config"),
            server: this.model.get("server"),
            client: this.model.get("client"),
            dark:
                this.model.get("dark") === null // only set if its a bool, otherwise inherit
                    ? document.body.getAttribute("data-jp-theme-light") === "false"
                    : this.model.get("dark"),
            editable: this.model.get("editable"),
            bindto: this.el,
            view: this
        });
        this.perspective_client = new PerspectiveJupyterClient(this);
        return this.pWidget.node;
    }

    _setElement(el: HTMLElement): void {
        if (this.el || el !== this.pWidget.node) {
            // Do not allow the view to be reassigned to a different element.
            throw new Error("Cannot reset the DOM element.");
        }
        this.el = this.pWidget.node;
    }

    /**
     * When state changes on the viewer DOM, apply it to the widget state.
     *
     * @param mutations
     */
    _synchronize_state(mutations: any): void {
        for (const mutation of mutations) {
            const name = mutation.attributeName.replace(/-/g, "_");
            let new_value = this.pWidget.viewer.getAttribute(mutation.attributeName);
            const current_value = this.model.get(name);

            if (typeof new_value === "undefined") {
                continue;
            }

            if (new_value && typeof new_value === "string" && name !== "plugin") {
                new_value = JSON.parse(new_value);
            }

            if (!isEqual(new_value, current_value)) {
                this.model.set(name, new_value);
            }
        }

        // propagate changes back to Python
        this.touch();
    }

    /**
     * Attach event handlers, and watch the DOM for state changes in order to
     * reflect them back to Python.
     */
    render(): void {
        super.render();

        this.model.on("msg:custom", this._handle_message, this);
        this.model.on("change:plugin", this.plugin_changed, this);
        this.model.on("change:columns", this.columns_changed, this);
        this.model.on("change:row_pivots", this.row_pivots_changed, this);
        this.model.on("change:column_pivots", this.column_pivots_changed, this);
        this.model.on("change:aggregates", this.aggregates_changed, this);
        this.model.on("change:sort", this.sort_changed, this);
        this.model.on("change:filters", this.filters_changed, this);
        this.model.on("change:computed_columns", this.computed_columns_changed, this);
        this.model.on("change:plugin_config", this.plugin_config_changed, this);
        this.model.on("change:dark", this.dark_changed, this);
        this.model.on("change:editable", this.editable_changed, this);

        // Watch the viewer DOM so that widget state is always synchronized with
        // DOM attributes.
        const observer = new MutationObserver(this._synchronize_state.bind(this));
        observer.observe(this.pWidget.viewer, {
            attributes: true,
            attributeFilter: ["plugin", "columns", "row-pivots", "column-pivots", "aggregates", "sort", "filters", "computed-columns"],
            subtree: false
        });

        /**
         * Request a table from the manager. If a table has been loaded, proxy
         * it and kick off subsequent operations.
         *
         * If a table hasn't been loaded, the viewer won't get a response back
         * and simply waits until it receives a table name.
         */
        this.perspective_client.send({
            id: -2,
            cmd: "table"
        });
    }

    /**
     * Handle messages from the Python Perspective instance.
     *
     * Messages should conform to the `PerspectiveJupyterMessage` interface.
     *
     * @param msg {PerspectiveJupyterMessage}
     */
    _handle_message(msg: PerspectiveJupyterMessage, buffers: Array<DataView>): void {
        if (this._pending_binary && buffers.length === 1) {
            // Handle binary messages from the widget, which (unlike the
            // tornado handler), does not send messages in chunks.
            const binary = buffers[0].buffer.slice(0);

            // make sure on_update callbacks are called with a `port_id`
            // AND the transferred binary.
            if (this._pending_port_id !== undefined) {
                // call handle individually to bypass typescript complaints
                // that we override `data` with different types.
                this.perspective_client._handle({
                    id: this._pending_binary,
                    data: {
                        id: this._pending_binary,
                        data: {
                            port_id: this._pending_port_id,
                            delta: binary
                        }
                    }
                });
            } else {
                this.perspective_client._handle({
                    id: this._pending_binary,
                    data: {
                        id: this._pending_binary,
                        data: binary
                    }
                });
            }
            this._pending_port_id = undefined;
            this._pending_binary = undefined;
            return;
        }

        if (msg.type === "table") {
            // If in client-only mode (no Table on the python widget),
            // message.data is an object containing "data" and "options".
            this._handle_load_message(msg);
        } else {
            if (msg.data["cmd"] === "delete") {
                // Regardless of client mode, if `delete()` is called we need to
                // clean up the Viewer.
                this.pWidget.delete();
                return;
            }

            if (this.pWidget.client === true) {
                // In client mode, we need to directly call the methods on the
                // viewer
                const command = msg.data["cmd"];
                if (command === "update") {
                    this.pWidget._update(msg.data["data"]);
                } else if (command === "replace") {
                    this.pWidget.replace(msg.data["data"]);
                } else if (command === "clear") {
                    this.pWidget.clear();
                }
            } else {
                // Make a deep copy of each message - widget views share the
                // same comm, so mutations on `msg` affect subsequent message
                // handlers.
                const message = JSON.parse(JSON.stringify(msg));

                delete message.type;
                if (typeof message.data === "string") {
                    message.data = JSON.parse(message.data);
                }

                if (message.data["binary_length"]) {
                    // If the `binary_length` flag is set, the worker expects
                    // the next message to be a transferable object. This sets
                    // the `_pending_binary` flag, which triggers a special
                    // handler for the ArrayBuffer containing binary data.
                    this._pending_binary = message.data.id;

                    // Check whether the message also contains a `port_id`,
                    // indicating that we are in an `on_update` callback and
                    // the pending binary needs to be joined with the port_id
                    // for on_update handlers to work properly.
                    if (message.data.data && message.data.data.port_id !== undefined) {
                        this._pending_port_id = message.data.data.port_id;
                    }
                } else {
                    this.perspective_client._handle(message);
                }
            }
        }
    }

    /**
     * Given a message that commands the widget to load a dataset or table,
     * process it.
     *
     * @param {PerspectiveJupyterMessage} msg
     */
    _handle_load_message(msg: PerspectiveJupyterMessage): void {
        const table_options = msg.data["options"] || {};

        if (this.pWidget.client) {
            /**
             * In client mode, retrieve the serialized data and the options
             * passed by the user, and create a new table on the client end.
             */
            const data = msg.data["data"];
            this.pWidget.load(data, table_options);
        } else {
            if (this.pWidget.server && msg.data["table_name"]) {
                /**
                 * Get a remote table handle, and load the remote table in
                 * the client for server mode Perspective.
                 */
                const table = this.perspective_client.open_table(msg.data["table_name"]);
                this.pWidget.load(table, table_options);
            } else if (msg.data["table_name"]) {
                /**
                 * Get a remote table handle from the Jupyter kernel, and
                 * create a view on that handle to run Perspective in
                 * distributed mode.
                 */
                const kernel_table: Table = this.perspective_client.open_table(msg.data["table_name"]);
                const kernel_view: View = kernel_table.view();

                // If the widget is editable, set up client/server editing
                if (this.pWidget.editable) {
                    let worker: PerspectiveWorker;
                    let client_table: Table;
                    let client_view: View;

                    kernel_view.to_arrow().then((arrow: ArrayBuffer) => {
                        worker = perspective.worker();
                        client_table = worker.table(arrow, table_options);
                        client_view = client_table.view();

                        let client_edit_port: number, server_edit_port: number;

                        // Create ports on the client and kernel.
                        Promise.all([this.pWidget.load(client_table), this.pWidget.getEditPort(), kernel_table.make_port()]).then(ports => {
                            client_edit_port = ports[1];
                            server_edit_port = ports[2];
                        });

                        /**
                         * When the client updates, if the update comes through
                         * the edit port then forward it to the server.
                         */
                        client_view.on_update(
                            updated => {
                                if (updated.port_id === client_edit_port) {
                                    kernel_table.update(updated.delta, {
                                        port_id: server_edit_port
                                    });
                                }
                            },
                            {mode: "row"}
                        );

                        /**
                         * If the server updates, and the edit is not coming
                         * from the server edit port, then synchronize state
                         * with the client.
                         */
                        kernel_view.on_update(
                            updated => {
                                if (updated.port_id !== server_edit_port) {
                                    client_table.update(updated.delta); // any port, we dont care
                                }
                            },
                            {mode: "row"}
                        );
                    });
                } else {
                    /**
                     * Just load the view into the widget, as the load
                     * semantics are handled by Perspective.
                     */
                    this.pWidget.load(kernel_view, table_options);
                }
            } else {
                throw new Error(`PerspectiveWidget cannot load data from kernel message: ${JSON.stringify(msg)}`);
            }

            // Only call `init` after the viewer has a table.
            this.perspective_client.send({
                id: -1,
                cmd: "init"
            });
        }
    }

    /**
     * When traitlets are updated in python, update the corresponding value on
     * the front-end viewer. `client` and `server` are not included, as they
     * are not properties in `<perspective-viewer>`.
     */
    plugin_changed(): void {
        this.pWidget.plugin = this.model.get("plugin");
    }

    columns_changed(): void {
        this.pWidget.columns = this.model.get("columns");
    }

    row_pivots_changed(): void {
        this.pWidget.row_pivots = this.model.get("row_pivots");
    }

    column_pivots_changed(): void {
        this.pWidget.column_pivots = this.model.get("column_pivots");
    }

    aggregates_changed(): void {
        this.pWidget.aggregates = this.model.get("aggregates");
    }

    sort_changed(): void {
        this.pWidget.sort = this.model.get("sort");
    }

    filters_changed(): void {
        this.pWidget.filters = this.model.get("filters");
    }

    computed_columns_changed(): void {
        this.pWidget.computed_columns = this.model.get("computed_columns");
    }

    plugin_config_changed(): void {
        this.pWidget.plugin_config = this.model.get("plugin_config");
    }

    dark_changed(): void {
        this.pWidget.dark = this.model.get("dark");
    }

    editable_changed(): void {
        this.pWidget.editable = this.model.get("editable");
    }
}
