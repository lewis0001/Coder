module.exports = {
  root: true,
  extends: ['universe/native', '../../packages/config/eslint/base.js'],
  parserOptions: {
    project: ['./tsconfig.json'],
    tsconfigRootDir: __dirname,
  },
};
