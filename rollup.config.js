import babel from 'rollup-plugin-babel';
import babelrc from 'babelrc-rollup';

const pkg = require('./package.json');



export default {
    entry: 'index.js',
    plugins: [
        babel(babelrc()),
    ],
    external: [
        'serializr',
        'mobx',
    ],
    globals: {
        serializr: 'serializr',
        mobx: 'mobx',
    },
    targets: [
        {
            dest: pkg.main,
            format: 'umd',
            moduleName: 'mobx-decorated-models',
            sourceMap: true,
        },
        {
            dest: pkg.module,
            format: 'es',
            sourceMap: true,
        },
    ],
};
