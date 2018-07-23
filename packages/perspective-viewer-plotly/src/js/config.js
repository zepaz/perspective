/******************************************************************************
 *
 * Copyright (c) 2017, the Perspective Authors.
 *
 * This file is part of the Perspective library, distributed under the terms of
 * the Apache License 2.0.  The full license can be found in the LICENSE file.
 *
 */


export function set_boost(config, series, ...types) {
    // const count = config.series[0].data ? config.series[0].data.length * config.series.length : config.series.length;
    // if (count > 5000) {
    //     Object.assign(config, {
    //         boost: {
    //             useGPUTranslations: types.indexOf('date') === -1,
    //             usePreAllocated: types.indexOf('date') === -1
    //         }
    //     });
    //     config.plotOptions.series.boostThreshold = 1;
    //     config.plotOptions.series.turboThreshold = 0;
    //     return true;
    // }
}

export function set_tick_size(config) {
    // let new_radius = Math.min(6, Math.max(3, Math.floor((this.clientWidth + this.clientHeight) / Math.max(300, config.series[0].data.length / 3))));
    // config.plotOptions.coloredScatter = {marker: {radius: new_radius}};
    // config.plotOptions.scatter = {marker: {radius: new_radius}};
}

export function set_both_axis(config, axis, name, type, tree_type, top) {
    // if (type === "string") {
    //     set_category_axis(config, axis, tree_type, top);
    // } else {
    //     set_axis(config, axis, name, type);
    // }
}

export function set_axis(config, axis, name, type) {
    // let opts = {
    //     type: type === "date" ? "datetime" : undefined,
    //     startOnTick: false,
    //     endOnTick: false,
    //     title: {
    //         style: {color: '#666666', fontSize: "14px"},
    //         text: name
    //     },
    // };
    // if (axis === 'yAxis') {
    //     Object.assign(opts, {labels : {overflow: 'justify'}});
    // }
    // Object.assign(config, {[axis]: opts});
}

export function set_category_axis(config, axis, type, top) {
    // if (type === 'date') {
    //     Object.assign(config, {
    //         [axis]: {
    //             categories: top.categories.map(x => new Date(x).toLocaleString('en-us',  { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' })),
    //             labels: {
    //                 enabled: (top.categories.length > 0),
    //                 autoRotation: [-5]
    //             },
    //         }
    //     });             
    // } else {
    //     let opts = {
    //         categories: top.categories,
    //         labels: {
    //             enabled: (top.categories.length > 0),
    //             padding: 0,
    //             autoRotation: [-10, -20, -30, -40, -50, -60, -70, -80, -90],
    //         }
    //     }
    //     if (axis === 'yAxis') {
    //         Object.assign(opts, {
    //             title: null,
    //             tickWidth: 1,
    //             reversed: true,
    //         });
    //     } 
    //     Object.assign(config, {[axis]: opts});
    // }
};

export function default_config(aggregates, mode) {

    let type = 'scatter';
    let mmode = 'markers';

    if (mode === 'line') {
        mmode = 'lines';
    } else if (mode === 'scatter') {

    }

    // let new_radius = 0;
    // if (mode === 'scatter') {
    //     new_radius = Math.min(8, Math.max(4, Math.floor((this.clientWidth + this.clientHeight) / Math.max(300, series[0].data.length / 3))));
    // }
    //

    // read this + define chart schema using _view()
    const that = this,
        config = that._view._config;

    // const axis_titles = get_axis_titles(config.aggregate);
    // const pivot_titles = get_pivot_titles(config.row_pivot, config.column_pivot);

    return {
        layout: {
          // xaxis: {
            // range: [ 0.75, 5.25 ]
          // },
          // yaxis: {
            // range: [0, 8]
          // },
          legend: {
            y: 0.5,
            yref: 'paper',
            font: {
              family: 'Arial, sans-serif',
              size: 20,
              color: 'grey',
            }
          },
          title:''
        },
        data: [{
          x: [],
          y: [],
          mode: mmode,
          type: type,
          name: '',
          text: [],
          textfont : {
            family:'Times New Roman'
          },
          textposition: 'bottom center',
          marker: { size: 12 }
        }]
    }
}

function get_axis_titles(aggs) {
    let titles = [];
    for (let i = 0; i < aggs.length; i++) {
        titles.push(aggs[i].column);
    }
    return titles;
}

function get_pivot_titles(row_pivots, column_pivots) {
    return {
        row: row_pivots,
        column: column_pivots
    }
}