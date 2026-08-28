module.exports = {
  root: true,
  env: { browser: true, es2020: true, node: true },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs', 'android/**'],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  settings: { react: { version: '18.2' } },
  plugins: ['react-refresh', 'vitest'],
  rules: {
    'react/prop-types': 'off',
    'react/no-unescaped-entities': 'warn',
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_' }],
    'no-empty': ['warn', { allowEmptyCatch: true }],
    'react-hooks/exhaustive-deps': 'error',
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    'vitest/expect-expect': 'error',
  },
  overrides: [
    {
      // Legacy bug-analysis proof log with console.log-only scenarios.
      // Keep it exempt; new tests are required to assert by vitest/expect-expect.
      files: ['src/__tests__/diagnostic_bugs.test.js'],
      rules: { 'vitest/expect-expect': 'off' },
    },
  ],
}
