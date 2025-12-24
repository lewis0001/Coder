module.exports = {
  root: true,
  extends: ['../../packages/config/eslint/base'],
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: ['./tsconfig.json'],
  },
};
