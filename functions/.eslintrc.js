/* eslint-env node */
module.exports = {
  root: true,
  env: {
    es2022: true,
    node: true,
  },
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "script",
  },
  extends: ["eslint:recommended"],
  rules: {
    "no-unused-vars": ["error", { 
      argsIgnorePattern: "^_", 
      varsIgnorePattern: "^(onRequest|onCall|logger|module|require|exports|process|__dirname|__filename)$" 
    }],
    "no-undef": "off", // Node.js 환경이므로 전역 변수 허용
  },
  ignorePatterns: [
    "node_modules/",
    "lib/",
    ".eslintrc.cjs"
  ],
  globals: {
    "module": "readonly",
    "require": "readonly",
    "exports": "writable",
    "process": "readonly",
    "__dirname": "readonly",
    "__filename": "readonly",
  }
};
