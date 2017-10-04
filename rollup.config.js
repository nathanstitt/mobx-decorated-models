import babel from 'rollup-plugin-babel';
const pkg = require('./package.json');

export default {
    entry: 'index.js',
    plugins: [
        babel({
            babelrc: false,
            runtimeHelpers: true,
            exclude: 'node_modules/**',

            plugins: [
                'transform-decorators-legacy',
                'transform-class-properties',
                'external-helpers',
                'transform-runtime',
            ],
        }),
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
