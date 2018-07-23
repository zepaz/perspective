const path = require('path');
const common = require('@jpmorganchase/perspective/src/config/common.config.js');

module.exports = Object.assign({}, common(), {
    entry: './src/js/plotly.js',
    externals: [/^[a-z0-9\@].*$/],
    output: {
        filename: 'plotly.plugin.umd.js',
        library: "perspective-view-plotly",
        libraryTarget: "umd",
        path: path.resolve(__dirname, '../../build')
    }
});