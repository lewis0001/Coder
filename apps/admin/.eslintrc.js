module.exports = {
  root: true,
  extends: ['next/core-web-vitals', '../../packages/config/eslint/base.js'],
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: ['./tsconfig.json'],
  },
};
