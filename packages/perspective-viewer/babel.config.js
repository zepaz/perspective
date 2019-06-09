module.exports = {
    presets: [
        [
            "@babel/preset-env",
            {
                useBuiltIns: "usage",
                corejs: 3
            }
        ]
    ],
    sourceType: "unambiguous",
    plugins: [
        "lodash",
        ["@babel/plugin-proposal-decorators", {legacy: true}],
        "transform-custom-element-classes",
        [
            "@babel/plugin-transform-for-of",
            {
                loose: true
            }
        ]
    ]
};
