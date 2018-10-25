import babel from 'rollup-plugin-babel';
const pkg = require('./package.json');
const plugins = [
    babel({ exclude: 'node_modules/**' }),
];

const input = 'index.js';
const external = ['serializr', 'mobx'];
const globals = {
    serializr: 'serializr',
    mobx: 'mobx',
};

export default {
    input,
    plugins,
    external,
    output: [
        {
            file: pkg.main,
            format: 'umd',
            name: 'mobx-decorated-models',
            moduleName: 'mobx-decorated-models',
            sourceMap: true,
            globals,
        },
        {
            file: pkg.module,
            format: 'es',
            sourceMap: true,
            globals,
        },
    ],
};
