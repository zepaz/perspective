/******************************************************************************
 *
 * Copyright (c) 2018, the Perspective Authors.
 *
 * This file is part of the Perspective library, distributed under the terms of
 * the Apache License 2.0.  The full license can be found in the LICENSE file.
 *
 */

import "@finos/perspective-viewer";
import {Widget} from "@phosphor/widgets";

export class PerspectiveViewerWidget extends Widget {
    constructor({title, table, viewer, node}) {
        super({node});
        viewer.setAttribute("name", title);
        this.viewer = viewer;
        this.table = table;

        this.title.label = title;
        this._loaded = false;
    }

    set master(value) {
        if (value) {
            this.viewer.classList.add("p-Master");
            this.viewer.classList.remove("p-Detail");
            this.viewer.selectable = true;
        } else {
            this.viewer.classList.add("p-Detail");
            this.viewer.classList.remove("p-Master");
            this.viewer.selectable = null;
        }
        this._master = value;
    }

    get master() {
        return this._master;
    }

    set table(value) {
        if (value) {
            if (this._loaded) {
                this.viewer.replace(value);
            } else {
                this.viewer.load(value);
            }
            this._loaded = true;
        }
    }

    get table() {
        return this.viewer.table;
    }

    toggleConfig() {
        return this.viewer.toggleConfig();
    }

    restore(config) {
        const {master, table, name, ...viewerConfig} = config;
        this.master = master;
        if (table) {
            this.viewer.setAttribute("table", table);
        }
        if (name) {
            this.viewer.setAttribute("name", name);
        }
        this.viewer.restore({...viewerConfig});
    }

    save() {
        return {
            ...this.viewer.save(),
            name: this.title.label,
            master: this.master,
            name: this.viewer.getAttribute("name"),
            table: this.viewer.getAttribute("table")
        };
    }

    addClass(name) {
        super.addClass(name);
        this.viewer && this.viewer.classList.add(name);
    }

    removeClass(name) {
        super.removeClass(name);
        this.viewer && this.viewer.classList.remove(name);
    }

    async onCloseRequest(msg) {
        super.onCloseRequest(msg);
        if (this.viewer.parentElement) {
            this.viewer.parentElement.removeChild(this.viewer);
        }
        await this.viewer.delete();
    }

    onResize(msg) {
        this.notifyResize();
        super.onResize(msg);
    }

    async notifyResize() {
        if (this.isVisible) {
            await this.viewer.notifyResize();
        }
    }
}
