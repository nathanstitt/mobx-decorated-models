import babel from 'rollup-plugin-babel';
const pkg = require('./package.json');

export default {
    entry: 'index.js',
    plugins: [
        babel({

            plugins: [
                'transform-decorators-legacy',
                'transform-class-properties',
                'external-helpers',
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
        'babel-runtime/core-js/map': 'Map',
        'babel-runtime/core-js/object/assign': 'Object.assign',
        'babel-runtime/core-js/object/keys': 'Object.keys',
        'babel-runtime/core-js/object/is-extensible': 'Object.isExtensible',
        'babel-runtime/helpers/typeof': 'typeof',
        'babel-runtime/helpers/toConsumableArray': 'toConsumableArray',
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
