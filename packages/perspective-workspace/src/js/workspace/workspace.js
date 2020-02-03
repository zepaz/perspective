/******************************************************************************
 *
 * Copyright (c) 2018, the Perspective Authors.
 *
 * This file is part of the Perspective library, distributed under the terms of
 * the Apache License 2.0.  The full license can be found in the LICENSE file.
 *
 */

import {find, toArray} from "@phosphor/algorithm";
import {Panel} from "@phosphor/widgets";
import {PerspectiveDockPanel} from "./dockpanel";
import {Menu} from "@phosphor/widgets";
import {MenuRenderer} from "./menu";
import {createCommands} from "./commands";

import {PerspectiveViewerWidget} from "./widget";
import uniqBy from "lodash/uniqBy";
import cloneDeep from "lodash/cloneDeep";
import {DiscreteSplitPanel} from "./discrete";

const DEFAULT_WORKSPACE_SIZE = [1, 3];

let ID_COUNTER = 0;

export const SIDE = {
    LEFT: "left",
    RIGHT: "right"
};

class ObservableMap extends Map {
    set(name, item) {
        this._set_listener?.(name, item);
        super.set(name, item);
    }

    get(name) {
        return super.get(name);
    }

    delete(name) {
        this._delete_listener?.(name);
        super.delete(name);
    }

    addSetListener(listener) {
        this._set_listener = listener;
    }

    addDeleteistener(listener) {
        this._delete_listener = listener;
    }
}

export class PerspectiveWorkspace extends DiscreteSplitPanel {
    constructor(element, options = {}) {
        super({orientation: "horizontal"});

        this.addClass("p-PerspectiveWorkspace");
        this.dockpanel = new PerspectiveDockPanel("main", {enableContextMenu: false});
        this.detailPanel = new Panel();
        this.detailPanel.layout.fitPolicy = "set-no-constraint";
        this.detailPanel.addClass("p-PerspectiveScrollPanel");
        this.detailPanel.addWidget(this.dockpanel);
        this.masterPanel = new DiscreteSplitPanel({orientation: "vertical"});
        this.masterPanel.addClass("p-MasterPanel");

        this.addWidget(this.detailPanel);

        this.element = element;
        this._side = options.side || SIDE.LEFT;

        this.listeners = new WeakMap();
        this._tables = new ObservableMap();
        this._tables.addSetListener(this._set_listener.bind(this));
        this._tables.addDeleteistener(this._delete_listener.bind(this));
        this.commands = createCommands(this);
        this.menuRenderer = new MenuRenderer(this.element);
    }

    /***************************************************************************
     *
     * `<perspective-workspace>` Public API
     *
     */

    get tables() {
        return this._tables;
    }

    set side(value) {
        if (SIDE[value.toUpperCase()] === undefined) {
            console.warn("Unknown `side` attribute:", value);
            return;
        }

        if (this._side !== value && this.masterPanel.isAttached) {
            const newSizes = this.relativeSizes()
                .slice()
                .reverse();

            this.detailPanel.close();
            this.masterPanel.close();

            if (value === SIDE.LEFT) {
                this.addWidget(this.masterPanel);
                this.addWidget(this.detailPanel);
            } else {
                this.addWidget(this.detailPanel);
                this.addWidget(this.masterPanel);
            }
            this.setRelativeSizes(newSizes);
        }
        this._side = value;
    }

    get side() {
        return this._side;
    }

    save() {
        const layout = {
            sizes: [...this.relativeSizes()],
            detail: PerspectiveDockPanel.mapWidgets(widget => widget.viewer.getAttribute("slot"), this.dockpanel.saveLayout())
        };
        if (this.masterPanel.isAttached) {
            const master = {
                widgets: this.masterPanel.widgets.map(widget => widget.viewer.getAttribute("slot")),
                sizes: [...this.masterPanel.relativeSizes()]
            };
            layout.master = master;
        }
        const viewers = {};
        for (const widget of this.masterPanel.widgets) {
            viewers[widget.viewer.getAttribute("slot")] = widget.save();
        }
        PerspectiveDockPanel.mapWidgets(widget => {
            viewers[widget.viewer.getAttribute("slot")] = widget.save();
        }, this.dockpanel.saveLayout());
        return {...layout, viewers};
    }

    restore(value) {
        const {sizes, master, detail, viewers: viewer_configs = []} = cloneDeep(value);
        if (master && master.widgets.length > 0) {
            this.setupMasterPanel(sizes || DEFAULT_WORKSPACE_SIZE);
        } else {
            this.addWidget(this.detailPanel);
        }

        // Using ES generators as context managers ..
        for (const viewers of this._capture_viewers()) {
            for (const widgets of this._capture_widgets()) {
                const callback = this._restore_callback.bind(this, viewer_configs, viewers, widgets);

                if (master) {
                    master.widgets.forEach(callback.bind(this, true));
                    master.sizes && this.masterPanel.setRelativeSizes(master.sizes);
                }

                if (detail) {
                    const detailLayout = PerspectiveDockPanel.mapWidgets(callback.bind(this, false), detail);
                    this.dockpanel.restoreLayout(detailLayout);
                }
            }
        }
    }

    *_capture_widgets() {
        const widgets = this.getAllWidgets();
        yield widgets;
        for (const widget of widgets) {
            if (!widget.node.isConnected) {
                widget.close();
            }
        }
    }

    *_capture_viewers() {
        const viewers = Array.from(this.element.children);
        yield viewers;
        const ending_widgets = this.getAllWidgets();
        for (const viewer of viewers) {
            let widget = ending_widgets.find(x => x.viewer === viewer);
            if (!widget && Array.from(this.element.children).indexOf(viewer) > -1) {
                this.element.removeChild(viewer);
                viewer.delete();
            }
        }
    }

    _restore_callback(viewers, starting_viewers, starting_widgets, master, widgetName) {
        const viewer_config = viewers[widgetName];
        let viewer = starting_viewers.find(x => x.getAttribute("slot") === widgetName);
        let widget;
        if (viewer) {
            widget = starting_widgets.find(x => x.viewer === viewer);
            if (widget) {
                widget.restore({master, ...viewer_config});
            } else {
                widget = this._createWidget({
                    config: {master, ...viewer_config},
                    viewer
                });
            }
        } else if (viewer_config) {
            widget = this._createWidgetAndNode({
                config: {master, ...viewer_config},
                slot: widgetName
            });
        } else {
            console.error(`Could not find or create <perspective-viewer> for slot "${widgetName}"`);
        }
        if (master) {
            widget.viewer.addEventListener("perspective-select", this.onPerspectiveSelect);
            widget.viewer.addEventListener("perspective-click", this.onPerspectiveSelect);
            // TODO remove event listener
            this.masterPanel.addWidget(widget);
        }
        return widget;
    }

    _validate(table) {
        if (!table.hasOwnProperty("view") || table.type !== "table") {
            throw new Error("Only `perspective.Table()` instances can be added to `tables`");
        }
        return table;
    }

    _set_listener(name, table) {
        if (table instanceof Promise) {
            table = table.then(this._validate);
        } else {
            this._validate(table);
        }
        this.getAllWidgets().forEach(widget => {
            if (widget.viewer.getAttribute("table") === name) {
                widget.viewer.load(table);
            }
        });
    }

    _delete_listener(name) {
        const isUsed = this.getAllWidgets().some(widget => widget.tableName === name);
        if (isUsed) {
            console.error(`Cannot remove table: '${name}' because it's still bound to widget(s)`);
        } else {
            const result = this.tables.delete(name);
            if (!result) {
                console.warn(`Table: '${name}' does not exist`);
            }
        }
    }

    update_widget_for_viewer(viewer) {
        let slot_name = viewer.getAttribute("slot");
        if (!slot_name) {
            slot_name = this._gen_id();
            viewer.setAttribute("slot", slot_name);
        }
        const table_name = viewer.getAttribute("table");
        if (table_name) {
            const slot = this.node.querySelector(`slot[name=${slot_name}]`);
            if (!slot) {
                //const name = viewer.getAttribute("name");
                console.warn(`Undocked ${viewer.outerHTML}, creating default layout`);
                const widget = this._createWidget({
                    title: viewer.getAttribute("name"),
                    table: this.tables.get(viewer.getAttribute("table")),
                    config: {master: false},
                    viewer
                });
                this.dockpanel.addWidget(widget);
                this.dockpanel.activateWidget(widget);
            }
        } else {
            console.warn(`No table set for ${viewer.outerHTML}`);
        }
    }

    remove_unslotted_widgets(viewers) {
        const widgets = this.getAllWidgets();
        for (const widget of widgets) {
            let missing = viewers.indexOf(widget.viewer) === -1;
            if (missing) {
                widget.close();
            }
        }
    }

    /***************************************************************************
     *
     * Workspace-level contextmenu actions
     *
     */

    duplicate(widget) {
        if (this.dockpanel.mode === "single-document") {
            this.toggleSingleDocument(widget);
        }
        const config = widget.save();
        config.name = `${config.name} (duplicate)`;
        const duplicate = this._createWidgetAndNode({config});
        if (widget.master) {
            const index = this.masterPanel.widgets.indexOf(widget) + 1;
            this.masterPanel.insertWidget(index, duplicate);
        } else {
            this.dockpanel.addWidget(duplicate, {mode: "split-right", ref: widget});
        }
    }

    toggleMasterDetail(widget) {
        if (widget.parent === this.dockpanel) {
            if (this.dockpanel.mode === "single-document") {
                this.toggleSingleDocument(widget);
            }
            this.makeMaster(widget);
        } else {
            this.makeDetail(widget);
        }
    }

    toggleSingleDocument(widget) {
        if (this.dockpanel.mode !== "single-document") {
            widget.viewer.classList.add("p-Maximize");
            this.single_document_prev_layout = this.dockpanel.saveLayout();
            this.dockpanel.mode = "single-document";
            this.dockpanel.activateWidget(widget);
            widget.notifyResize();
        } else {
            widget.viewer.classList.remove("p-Maximize");
            this.dockpanel.mode = "multiple-document";
            this.dockpanel.restoreLayout(this.single_document_prev_layout);
        }
    }

    filterWidget(candidates, filters) {
        toArray(this.dockpanel.widgets()).forEach(async widget => {
            const config = widget.save();
            const availableColumns = Object.keys(await widget.table.schema());
            const currentFilters = config.filters || [];
            const columnAvailable = filter => filter[0] && availableColumns.includes(filter[0]);
            const validFilters = filters.filter(columnAvailable);

            validFilters.push(...currentFilters.filter(x => !candidates.has(x[0])));
            const newFilters = uniqBy(validFilters, item => item[0]);
            widget.restore({filters: newFilters});
        }, this.dockpanel.saveLayout());
    }

    onPerspectiveSelect = event => {
        const config = event.target.save();
        // perspective-select is already handled for hypergrid
        if (event.type === "perspective-click" && config.plugin === "hypergrid") {
            return;
        }
        const candidates = new Set([...(config["row-pivots"] || []), ...(config["column-pivots"] || []), ...(config.filters || []).map(x => x[0])]);
        const filters = [...event.detail.config.filters];
        this.filterWidget(candidates, filters);
    };

    makeMaster(widget) {
        widget.master = true;

        if (!this.masterPanel.isAttached) {
            this.detailPanel.close();
            this.setupMasterPanel(DEFAULT_WORKSPACE_SIZE);
        }

        this.masterPanel.addWidget(widget);
        widget.isHidden && widget.show();

        widget.selectable = true;
        widget.viewer.restyleElement();
        widget.viewer.addEventListener("perspective-click", this.onPerspectiveSelect);
        widget.viewer.addEventListener("perspective-select", this.onPerspectiveSelect);
    }

    makeDetail(widget) {
        widget.master = false;

        this.dockpanel.addWidget(widget, {mode: `split-${this._side}`});

        if (this.masterPanel.widgets.length === 0) {
            this.detailPanel.close();
            this.masterPanel.close();
            this.addWidget(this.detailPanel);
        }
        widget.selectable = false;
        widget.viewer.restyleElement();
        widget.viewer.removeEventListener("perspective-click", this.onPerspectiveSelect);
        widget.viewer.removeEventListener("perspective-select", this.onPerspectiveSelect);
    }

    /***************************************************************************
     *
     * Context Menu
     *
     */

    createContextMenu(widget) {
        const contextMenu = new Menu({commands: this.commands, renderer: this.menuRenderer});

        contextMenu.addItem({command: "workspace:maximize", args: {widget}});
        contextMenu.addItem({command: "workspace:minimize", args: {widget}});
        contextMenu.addItem({command: "workspace:duplicate", args: {widget}});
        contextMenu.addItem({command: "workspace:master", args: {widget}});

        contextMenu.addItem({type: "separator"});

        contextMenu.addItem({command: "workspace:export", args: {widget}});
        contextMenu.addItem({command: "workspace:copy", args: {widget}});
        contextMenu.addItem({command: "workspace:reset", args: {widget}});
        return contextMenu;
    }

    showContextMenu(widget, event) {
        const menu = this.createContextMenu(widget);
        const tabbar = find(this.dockpanel.tabBars(), bar => bar.currentTitle.owner === widget);

        widget.addClass("p-ContextFocus");
        tabbar && tabbar.node.classList.add("p-ContextFocus");
        this.element.classList.add("p-ContextMenu");
        this.addClass("p-ContextMenu");
        if (widget.viewer.classList.contains("p-Master")) {
            menu.node.classList.add("p-Master");
        } else {
            menu.node.classList.remove("p-Master");
        }
        this._menu_opened = true;

        menu.aboutToClose.connect(() => {
            this.element.classList.remove("p-ContextMenu");
            this.removeClass("p-ContextMenu");
            widget.removeClass("p-ContextFocus");
            tabbar?.node?.classList.remove("p-ContextFocus");
        });

        menu.open(event.clientX, event.clientY);
        event.preventDefault();
        event.stopPropagation();
    }

    /***************************************************************************
     *
     * Context Menu
     *
     */

    clearLayout() {
        this.getAllWidgets().forEach(widget => widget.close());
        this.widgets.forEach(widget => widget.close());
        this.detailPanel.close();

        if (this.masterPanel.isAttached) {
            this.masterPanel.close();
        }
    }

    setupMasterPanel(sizes) {
        if (this.side === SIDE.RIGHT) {
            this.addWidget(this.detailPanel);
            this.addWidget(this.masterPanel);
            this.setRelativeSizes(sizes.slice().reverse());
        } else {
            this.addWidget(this.masterPanel);
            this.addWidget(this.detailPanel);
            this.setRelativeSizes(sizes);
        }
    }

    /*********************************************************************
     * Widget helper methods
     */

    _createWidgetAndNode({config, slot: slotname}) {
        const node = this._createNode(slotname);
        const table = config.table;
        const viewer = document.createElement("perspective-viewer");
        viewer.setAttribute("slot", node.children[0].getAttribute("name"));
        if (table) {
            viewer.setAttribute("table", table);
        }
        return this._createWidget({config, node, viewer});
    }

    _gen_id() {
        return `PERSPECTIVE_GENERATED_ID_${ID_COUNTER++}`;
    }

    _createNode(slotname) {
        let node = this.node.querySelector(`slot[name=${slotname}]`);
        if (!node) {
            const slot = document.createElement("slot");
            slotname = slotname || this._gen_id();
            slot.setAttribute("name", slotname);
            node = document.createElement("div");
            node.classList.add("p-Widget");
            node.appendChild(slot);
        }
        return node;
    }

    _createWidget({config, node, viewer}) {
        const title = config.name || viewer.getAttribute("name");
        if (!node) {
            const slotname = viewer.getAttribute("slot");
            node = this.node.querySelector(`slot[name=${slotname}]`);
            if (!node) {
                node = this._createNode(slotname);
            } else {
                node = node.parentElement;
            }
        }
        const table = this.tables.get(viewer.getAttribute("table") || config.table);
        const widget = new PerspectiveViewerWidget({title, table, node, viewer});
        widget.title.closable = true;
        this.element.appendChild(widget.viewer);
        this._addWidgetEventListeners(widget);
        widget.restore(config);
        return widget;
    }

    _addWidgetEventListeners(widget) {
        if (this.listeners.has(widget)) {
            this.listeners.get(widget)();
        }
        const settings = event => {
            widget.title.className = event.detail && "settings_open";
        };
        const contextMenu = event => this.showContextMenu(widget, event);
        widget.viewer.addEventListener("contextmenu", contextMenu);
        widget.viewer.addEventListener("perspective-toggle-settings", settings);

        this.listeners.set(widget, () => {
            widget.viewer.removeEventListener("contextmenu", contextMenu);
            widget.viewer.removeEventListener("perspective-toggle-settings", settings);
        });
    }

    getAllWidgets() {
        return [...this.masterPanel.widgets, ...toArray(this.dockpanel.widgets())];
    }
}
