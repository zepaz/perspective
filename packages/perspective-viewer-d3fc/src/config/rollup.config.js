import babel from "rollup-plugin-babel";
import html from "rollup-plugin-html";
import postcss from "rollup-plugin-postcss";
import commonjs from "rollup-plugin-commonjs";
import autoExternal from "rollup-plugin-auto-external";
import resolve from "rollup-plugin-node-resolve";
import globals from "rollup-plugin-node-globals";
import {uglify} from "rollup-plugin-uglify";
import * as babelConfig from "../../babel.config.js";
import progress from "rollup-plugin-progress";
import filesize from "rollup-plugin-filesize";

module.exports = [
    {
        input: "src/js/index.js",
        output: {
            file: "build/perspective-viewer-d3fc.js",
            sourcemap: true,
            format: "cjs"
        },
        moduleContext: {
            "../../node_modules/@webcomponents/shadycss/custom-style-interface.min.js": "window"
        },
        onwarn: function(warning, warn) {
            if (warning.code === "CIRCULAR_DEPENDENCY") return;
            warn(warning);
        },
        plugins: [
            postcss({inject: false, minimize: {
                preset: ['default', {
                    minifyGradients: false
                }]
            }}),
            babel({
                exclude: [/node_modules/, /\/core-js\//],
                include: ["src/js/**", /perspective/],
                ...babelConfig
            }),
            html({
                include: "**/*.html"
            }),
            resolve(),
            autoExternal(),
            commonjs({
                namedExports: {
                    "../../node_modules/mobile-drag-drop/index.min.js": ["polyfill"],
                    "../../node_modules/d3fc/build/d3fc.js": [
                        "rebindAll",
                        "dataJoin",
                        "axisOrdinalTop",
                        "axisOrdinalBottom",
                        "axisOrdinalLeft",
                        "axisOrdinalRight",
                        "exclude",
                        "seriesCanvasPoint",
                        "seriesCanvasOhlc",
                        "seriesCanvasCandlestick",
                        "seriesCanvasMulti",
                        "extentTime",
                        "axisBottom",
                        "axisTop",
                        "axisLeft",
                        "axisRight",
                        "chartCanvasCartesian",
                        "chartSvgCartesian",
                        "seriesSvgGrouped",
                        "seriesSvgBar",
                        "autoBandwidth",
                        "seriesSvgMulti",
                        "annotationSvgGridline",
                        "annotationCanvasGridline",
                        "seriesSvgLine",
                        "pointer",
                        "seriesSvgRepeat",
                        "seriesSvgPoint",
                        "extentLinear",
                        "seriesSvgArea",
                        "seriesSvgHeatmap",
                        "seriesCanvasLine",
                        "seriesCanvasArea",
                        "indicatorBollingerBands"
                    ]
                }
            }),
            globals(),
            progress({
                clearLine: true
            }),
            filesize()
            // uglify()
        ]
    }
];
