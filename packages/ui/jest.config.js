const base = require('@orbit/config/jest/base');

module.exports = {
  ...base,
  rootDir: __dirname,
  coverageDirectory: 'coverage',
};
