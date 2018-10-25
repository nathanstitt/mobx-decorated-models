module.exports = {
    presets: [
        [
            "@babel/preset-env", {
                targets: {
                    "esmodules": true
                },
            },
        ],
    ],
    plugins: [
        ["@babel/plugin-proposal-decorators", { legacy: true } ],
        ["@babel/plugin-proposal-class-properties", { loose: true } ],
    ],
};
