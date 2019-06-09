const path = require("path");
const common = require("@finos/perspective/src/config/common.config.js");

module.exports = Object.assign({}, common(), {
    entry: "./build/perspective-viewer.js",
    output: {
        filename: "perspective.view.js",
        libraryTarget: "umd",
        path: path.resolve(__dirname, "../../build")
    }
});
