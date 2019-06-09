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
        input: "src/js/viewer.js",
        output: {
            file: "build/perspective-viewer.cjs.js",
            format: "cjs"
        },
        moduleContext: {"../../node_modules/@webcomponents/shadycss/custom-style-interface.min.js": "window"},
        plugins: [
            postcss({inject: false, minimize: true}),
            babel({
                exclude: [/node_modules/, /\/core-js\//],
                include: "src/js/**",
                ...babelConfig
            }),
            html({
                include: "**/*.html"
            }),
            resolve(),
            autoExternal(),
            commonjs({
                namedExports: {
                    "../../node_modules/mobile-drag-drop/index.min.js": ["polyfill"]
                }
            }),
            globals(),
            progress({
                clearLine: true
            }),
            filesize(),
            uglify()
        ]
    },
    {
        input: "src/js/viewer.js",
        output: {
            file: "build/perspective-viewer.js",
            format: "cjs"
        },
        moduleContext: {"../../node_modules/@webcomponents/shadycss/custom-style-interface.min.js": "window"},
        plugins: [
            postcss({inject: false, minimize: true}),
            babel({
                exclude: [/node_modules/, /\/core-js\//],
                include: "src/js/**",
                ...babelConfig
            }),
            html({
                include: "**/*.html"
            }),
            resolve(),
            commonjs({
                namedExports: {
                    "../../node_modules/mobile-drag-drop/index.min.js": ["polyfill"]
                }
            }),
            globals(),
            progress({
                clearLine: true
            }),
            filesize(),
            uglify()
        ]
    }
];

const path = require("path");
const fs = require("fs");

const THEMES = fs.readdirSync(path.resolve(__dirname, "..", "themes"));

for (const theme of THEMES) {
    const name = theme.replace(".less", "");
    const filepath = path.resolve(__dirname, "..", "themes", theme);
    module.exports.push({
        input: filepath,
        output: {
            file: `build/${name}.css`,
            format: "es"
        },
        plugins: [postcss({inject: false, minimize: true, extract: true})]
    });
}
