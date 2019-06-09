import babel from "rollup-plugin-babel";
import html from "rollup-plugin-html";
import postcss from "rollup-plugin-postcss";
import commonjs from "rollup-plugin-commonjs";
import resolve from "rollup-plugin-node-resolve";
import globals from "rollup-plugin-node-globals";
import {uglify} from "rollup-plugin-uglify";
import * as babelConfig from "../../babel.config.js";

module.exports = {
    input: "src/js/viewer.js",
    output: {
        file: "build/perspective-viewer.js",
        format: "cjs"
    },
    moduleContext: {"../../node_modules/@webcomponents/shadycss/custom-style-interface.min.js": "window"},
    plugins: [
        postcss({inject: false}),
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
        uglify(),
        globals()
    ]
};
