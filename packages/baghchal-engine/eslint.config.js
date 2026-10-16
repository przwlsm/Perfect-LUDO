const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');

// The same rule set as the apps, so engine code reads like app code.
module.exports = defineConfig([expoConfig, prettierConfig, { ignores: ['coverage/*'] }]);
