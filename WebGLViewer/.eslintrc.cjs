module.exports = {
  env: {
    browser: true,
    es2021: true
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking'
  ],
  overrides: [],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: [
      resolve(__dirname, './tsconfig.json'),
      resolve(__dirname, './tsconfig.eslint.json'),
    ],
  },
  plugins: [
    'react',
    '@typescript-eslint'
  ],
  rules: {
  },
  settings: {
    react: {
      version: 'detect'
    }
  }
}
