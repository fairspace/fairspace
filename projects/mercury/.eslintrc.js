module.exports = {
    env: {
        browser: true,
        jest: true,
        'jest/globals': true
    },
    plugins: ['ft-flow', 'react-hooks', 'jest'],
    extends: [
        'eslint-config-react-app', // This is the default react-app config, was used once we switched custom linter off
        'airbnb',
        'plugin:prettier/recommended',
        'plugin:jest/recommended'
    ],
    parser: 'hermes-eslint',
    parserOptions: {
        requireConfigFile: false
    },
    rules: {
        'react-hooks/rules-of-hooks': 'error',
        'react-hooks/exhaustive-deps': 'warn',
        'ft-flow/define-flow-type': 1,
        'class-methods-use-this': 0,
        'import/no-named-as-default': 0,
        'react/jsx-filename-extension': [
            'error',
            {
                extensions: ['.js', '.jsx']
            }
        ],
        'object-curly-spacing': ['error', 'never'],
        'comma-dangle': 0,
        'no-console': [
            'error',
            {
                allow: ['warn', 'error']
            }
        ],
        'max-len': 0,
        'react/jsx-indent': 0,
        'react/jsx-indent-props': 0,
        'react/prop-types': 0,
        'react/destructuring-assignment': 0,
        'react/jsx-one-expression-per-line': 0,
        'block-spacing': 0,
        'arrow-parens': 0,
        'no-param-reassign': [
            2,
            {
                props: false
            }
        ],
        'jsx-a11y/click-events-have-key-events': 0,
        'jsx-a11y/no-static-element-interactions': 0,
        'object-curly-newline': [
            'error',
            {
                consistent: true
            }
        ],
        'react/require-default-props': 0,
        'react/forbid-prop-types': 0,
        'import/prefer-default-export': 0,
        'import/no-extraneous-dependencies': ['error', {devDependencies: true}],
        'prefer-template': 0,
        'react/state-in-constructor': 0,
        'react/jsx-props-no-spreading': 0,
        'jest/no-test-callback': 0,
        'jest/no-try-expect': 0,
        'react/static-property-placement': 0,
        'react/default-props-match-prop-types': 0,
        'no-cond-assign': ['error', 'except-parens'],
        'no-plusplus': 0,
        'jsx-a11y/anchor-is-valid': 0,
        'react/no-unused-prop-types': 0
    }
};
