module.exports = {
  root: true,
  extends: ['../config/eslint/base'],
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: './tsconfig.json',
  },
};
