import babel from "rollup-plugin-babel";
import html from "rollup-plugin-html";
import less from "rollup-plugin-less";
import commonjs from "rollup-plugin-commonjs";
import resolve from "rollup-plugin-node-resolve";
import autoExternal from "rollup-plugin-auto-external";

module.exports = {
    input: "src/js/viewer.js",
    output: {
        file: "build/perspective-viewer.js",
        format: "cjs"
    },
    external: id => id.includes("core-js"),
    plugins: [
        babel({
            exclude: ["node_modules/**"]
        }),
        html({
            include: "**/*.html"
        }),
        less({insert: false}),
        autoExternal()
        // commonjs(),
        // resolve({browser: true})
        // globals(),
        // builtins()
    ]
};
