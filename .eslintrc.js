module.exports = {
    "extends": "airbnb",
    "parser": "babel-eslint",
    "installedESLint": true,
    "rules": {
        "indent": [2, 4],
        "object-property-newline": 0,
        "no-param-reassign": 0,
        "react/jsx-indent": [2, 4],
        "react/jsx-indent-props": [2, 4],
        "import/no-unresolved": 0,
        "import/extensions": 0,
        "import/no-extraneous-dependencies": [0, { devDependencies: true }]
    },
    "globals": {
    },
    "plugins": [
        "react",
        "jsx-a11y",
        "import"
    ]
};
