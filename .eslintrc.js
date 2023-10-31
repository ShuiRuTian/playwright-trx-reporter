module.exports = {
  env: {
    node: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    // follow the recommandation https://github.com/typescript-eslint/typescript-eslint/issues/890
    project: './tsconfig.eslint.json',
  },
  extends: [
    'airbnb-base',
    'airbnb-typescript/base',
  ],
  rules: {
    'linebreak-style': 'off',
    'max-len': 'off',
    'import/prefer-default-export': 'off',
    'no-underscore-dangle': 'off',
    'max-classes-per-file': 'off',
  },
};
