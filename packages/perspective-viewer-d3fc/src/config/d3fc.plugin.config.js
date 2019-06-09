const path = require("path");
const common = require("@finos/perspective/src/config/common.config.js");

module.exports = Object.assign({}, common(), {
    entry: "./build/perspective-viewer-d3fc.js",
    output: {
        filename: "d3fc.plugin.js",
        library: "perspective-view-d3fc",
        libraryTarget: "umd",
        path: path.resolve(__dirname, "../../build")
    }
});
