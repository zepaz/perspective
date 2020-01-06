/******************************************************************************
 *
 * Copyright (c) 2018, the Perspective Authors.
 *
 * This file is part of the Perspective library, distributed under the terms of
 * the Apache License 2.0.  The full license can be found in the LICENSE file.
 *
 */

import {swap} from "../utils.js";

function calc_index(event) {
    if (this._active_columns.children.length == 0) {
        return 0;
    } else {
        for (let cidx in this._active_columns.children) {
            let child = this._active_columns.children[cidx];
            if (child.offsetTop + child.offsetHeight > event.offsetY + this._active_columns.scrollTop) {
                return parseInt(cidx);
            }
        }
        return this._active_columns.children.length;
    }
}

export function dragend(event) {
    let div = event.target.getRootNode().host;
    let parent = div;
    if (parent.tagName === "PERSPECTIVE-VIEWER") {
        parent = event.target.parentElement;
    } else {
        parent = div.parentElement;
    }
    let idx = Array.prototype.slice.call(parent.children).indexOf(div.tagName === "PERSPECTIVE-ROW" ? div : event.target);
    let attr_name = parent.getAttribute("for");
    if (this.hasAttribute(attr_name)) {
        let attr_value = JSON.parse(this.getAttribute(attr_name));
        attr_value.splice(idx, 1);
        if (attr_value.length === 0) {
            this.removeAttribute(attr_name);
        } else {
            this.setAttribute(attr_name, JSON.stringify(attr_value));
        }
    }
}

export function drop(ev) {
    ev.preventDefault();
    ev.currentTarget.classList.remove("dropping");
    if (this._drop_target_hover) {
        this._drop_target_hover.removeAttribute("drop-target");
    }
    let data = ev.dataTransfer.getData("text");
    if (!data) return;
    data = JSON.parse(data);

    // Update the columns attribute
    let name = ev.currentTarget.querySelector("ul").getAttribute("for") || ev.currentTarget.getAttribute("id").replace("_", "-");
    let columns = JSON.parse(this.getAttribute(name) || "[]");
    let data_index = columns.indexOf(data[0]);
    if (data_index !== -1) {
        columns.splice(data_index, 1);
    }

    const filtering = name.indexOf("filter") > -1;
    if (filtering) {
        this.setAttribute(name, JSON.stringify(columns.concat([data])));
    } else if (name.indexOf("sort") > -1) {
        this.setAttribute(name, JSON.stringify(columns.concat([[data[0]]])));
    } else {
        this.setAttribute(name, JSON.stringify(columns.concat([data[0]])));
    }

    // Deselect the dropped column
    if (this._plugin.deselectMode === "pivots" && this._get_visible_column_count() > 1 && name !== "sort" && !filtering) {
        for (let x of this.shadowRoot.querySelectorAll("#active_columns perspective-row")) {
            if (x.getAttribute("name") === data[0]) {
                this._active_columns.removeChild(x);
                break;
            }
        }
        this._update_column_view();
    }

    this._debounce_update();
}

export function column_dragend(event) {
    let data = event.target.parentElement.parentElement;
    if (this._get_visible_column_count() > 1 && event.dataTransfer.dropEffect !== "move") {
        this._active_columns.removeChild(data);
        this._update_column_view();
    }
    this._active_columns.classList.remove("dropping");
}

export function column_dragleave(event) {
    let src = event.relatedTarget;
    while (src && src !== this._active_columns) {
        src = src.parentElement;
    }
    if (src === null) {
        this._active_columns.classList.remove("dropping");
        if (this._drop_target_null) {
            this._active_columns.replaceChild(this._drop_target_null, this._drop_target_hover);
            delete this._drop_target_null;
        }
        if (this._drop_target_hover.parentElement === this._active_columns) {
            this._active_columns.removeChild(this._drop_target_hover);
        }
        if (this._original_index !== -1) {
            this._active_columns.insertBefore(this._drop_target_hover, this._active_columns.children[this._original_index]);
        }
        this._drop_target_hover.removeAttribute("drop-target");
    }
}

function _unset_drop_target_null() {
    if (this._drop_target_null) {
        if (this._drop_target_null.parentElement === this._active_columns) {
            swap(this._active_columns, this._drop_target_hover, this._drop_target_null);
        } else {
            this._active_columns.replaceChild(this._drop_target_null, this._drop_target_hover);
        }
        delete this._drop_target_null;
    }
}

export function column_dragover(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (event.currentTarget.className !== "dropping") {
        event.currentTarget.classList.add("dropping");
    }
    if (!this._drop_target_hover.hasAttribute("drop-target")) {
        this._drop_target_hover.toggleAttribute("drop-target", true);
    }
    let new_index = calc_index.call(this, event);
    const over_elem = this._active_columns.children[new_index];
    const is_replace = new_index < this._plugin.initial?.names?.length - 1 || (this._plugin.initial?.names.length && this._original_index !== -1);
    if (is_replace && this._drop_target_hover !== this._active_columns.children[new_index]) {
        // Hovered column is a real column in a "replace" zone, and the next_col
        // is a not a "null-column" or undefined.  In this specific case,
        // replace.
        _unset_drop_target_null.call(this);
        if (over_elem) {
            if (this._original_index > -1) {
                if (this._original_index < this._plugin.initial?.count && new_index >= this._plugin.initial?.count && over_elem?.classList.contains("null-column")) {
                } else if (this._drop_target_hover !== this._active_columns.children[new_index]) {
                    this._drop_target_null = this._active_columns.children[new_index];
                    swap(this._active_columns, over_elem, this._drop_target_hover);
                }
            } else {
                this._drop_target_null = this._active_columns.children[new_index];
                this._active_columns.replaceChild(this._drop_target_hover, this._active_columns.children[new_index]);
            }
        }
    } else if (over_elem?.classList.contains("null-column")) {
        // Hovered column is a `null` cell in an "append" zone, so replace the
        // contents and keep track of the tile to replace on `dragleave`.
        _unset_drop_target_null.call(this);
        this._drop_target_null = over_elem;
        if (this._original_index > -1) {
            swap(this._active_columns, this._drop_target_hover, over_elem);
        } else {
            this._active_columns.replaceChild(this._drop_target_hover, over_elem);
        }
    } else {
        // Hovered column is a real column in an "append" zone, so shift the
        // hovered cell and all its predecessors down one row.
        let current_index = Array.prototype.slice.call(this._active_columns.children).indexOf(this._drop_target_hover);
        if (current_index < new_index) new_index += 1;
        if (new_index < this._active_columns.children.length) {
            if (!this._active_columns.children[new_index].hasAttribute("drop-target")) {
                _unset_drop_target_null.call(this);
                this._active_columns.insertBefore(this._drop_target_hover, this._active_columns.children[new_index]);
            }
        } else {
            if (!this._active_columns.children[this._active_columns.children.length - 1].hasAttribute("drop-target")) {
                _unset_drop_target_null.call(this);
                this._active_columns.appendChild(this._drop_target_hover);
            }
        }
    }
}

export function column_drop(ev) {
    ev.preventDefault();
    delete this._drop_target_null;
    ev.currentTarget.classList.remove("dropping");
    if (this._drop_target_hover.parentElement === this._active_columns) {
        this._drop_target_hover.removeAttribute("drop-target");
    }
    let data = ev.dataTransfer.getData("text");
    if (!data) return;

    this._update_column_view();
}

export function dragenter(ev) {
    ev.stopPropagation();
    ev.preventDefault();
    ev.currentTarget.classList.add("dropping");
}

export function dragover(ev) {
    ev.stopPropagation();
    ev.preventDefault();
    ev.currentTarget.classList.add("dropping");
    ev.dataTransfer.dropEffect = "move";
}

export function dragleave(ev) {
    if (ev.currentTarget == ev.target) {
        ev.stopPropagation();
        ev.preventDefault();
        ev.currentTarget.classList.remove("dropping");
    }
}
