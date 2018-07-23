/******************************************************************************
 *
 * Copyright (c) 2017, the Perspective Authors.
 *
 * This file is part of the Perspective library, distributed under the terms of
 * the Apache License 2.0.  The full license can be found in the LICENSE file.
 *
 */

import plotly from 'plotly.js';
const Plotly = plotly;

import "../less/plotly.less";

import {make_tree_data, make_y_data, make_xy_data, make_xyz_data} from "./series.js";
import {set_boost, set_axis, set_category_axis, set_both_axis, default_config, set_tick_size} from "./config.js";


export const draw = (mode) => async function (el, view, task) {
    const row_pivots = this._view_columns('#row_pivots perspective-row:not(.off)');
    const col_pivots = this._view_columns('#column_pivots perspective-row:not(.off)');
    const aggregates = this._get_view_aggregates();
    const hidden = this._get_view_hidden(aggregates);

    const [js, schema, tschema] = await Promise.all([view.to_json(), view.schema(), this._table.schema()]);

    if (task.cancelled) {
        return;
    }

    if (!this._charts) {
        this._charts = [];
    }

    if (this.hasAttribute('updating') && this._charts.length > 0) {
        for (let chart of this._charts) {
            try {
                chart.destroy();
            } catch (e) {
                console.warn("Scatter plot destroy() call failed - this is probably leaking memory");
            }
        }
        this._charts = [];
    }


    let configs = [],
        xaxis_name = aggregates.length > 0 ? aggregates[0].column : undefined,
        xaxis_type = schema[xaxis_name],
        yaxis_name = aggregates.length > 1 ? aggregates[1].column : undefined,
        yaxis_type = schema[yaxis_name],
        xtree_name = row_pivots.length > 0 ? row_pivots[row_pivots.length - 1] : undefined,
        xtree_type = tschema[xtree_name],
        ytree_name = col_pivots.length > 1 ? col_pivots[col_pivots.length - 1] : undefined,
        ytree_type = tschema[ytree_name],
        num_aggregates = aggregates.length - hidden.length;

    if (mode === 'scatter') {
        let config = configs[0] = default_config.call(this, aggregates, mode, js, col_pivots);
        let [series, xtop, colorRange, ytop] = make_xy_data(js, schema, aggregates.map(x => x.column), row_pivots, col_pivots, hidden);

        // Plotly is column based, not record based
        var result = Object.keys(series[0]['data']).reduce(function (r, k) {
            Object.keys(series[0]['data'][k]).forEach(function (l) {
                r[l] = r[l] || {};
                r[l][k] = series[0]['data'][k][l];
            });
            return r;
        }, {})

        config.data[0].x = Object.values(result.x);
        config.data[0].y = Object.values(result.y);

        // set_both_axis(config, 'xAxis', xaxis_name, xaxis_type, xtree_type, xtop);
        // set_both_axis(config, 'yAxis', yaxis_name, yaxis_type, ytree_type, ytop);
        // set_tick_size.call(this, config);

    } else if (mode === 'line') {
        console.log(mode);
        configs.push({data:[{
          x: [2, 3, 4, 5],
          y: [16, 5, 11, 9],
          mode: 'lines',
          type: 'scatter'
        }]});
    } else {
        console.log(mode);
        configs.push({data:[{
            x: [1, 2, 3, 4],
            y: [12, 9, 15, 12],
            mode: 'lines+markers',
            type: 'scatter'
        }]});
    }

    if (this._charts.length > 0) {
        let idx = 0;
        for (let chart of this._charts) {
            if (mode === 'scatter') {
                // chart.update(conf);
            } else if (mode.indexOf('line') > -1) {
                // chart.update({
                    // series: config.series
                // });
            } else {
                // let opts = {series: config.series, xAxis: config.xAxis, yAxis: config.yAxis};
                // chart.update(opts);
            }
        }
    } else {
        this._charts = [];
        for (let e of Array.prototype.slice.call(el.children)) { el.removeChild(e); }
        for (let config of configs) {
            let chart = document.createElement('div');
            chart.className = 'chart';
            el.appendChild(chart);
            this._charts.push(() => Plotly.newPlot(chart, config['data'], config['layout']));
        }
        this._charts = this._charts.map(x => x());
    }

    // if (!this._charts.every(x => document.contains(x.renderTo))) {
    //     for (let e of Array.prototype.slice.call(el.children)) { el.removeChild(e); }
    //     this._charts.map(x => el.appendChild(x.renderTo));
    // }
}

