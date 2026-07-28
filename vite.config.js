// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const noExternal = [
  '@mui/material',
  '@mui/system',
  '@mui/icons-material',
  '@mui/styled-engine',
  '@emotion/react',
  '@emotion/styled',
  '@emotion/cache'
];

export default defineConfig({
  plugins: [react({
    jsxRuntime: 'automatic',
    jsxImportSource: '@emotion/react',
    babel: {
      plugins: ['@emotion/babel-plugin'],
    },
  })],

  resolve: {
    // so that vite not inject the vite-optional-deep
    dedupe: [
      'react',
      'react-dom',
      '@emotion/react',
      '@emotion/styled'
    ],

    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@emotion/react': path.resolve(
        __dirname,
        'node_modules/@emotion/react'
      ),
      '@emotion/styled': path.resolve(
        __dirname,
        'node_modules/@emotion/styled'
      ),
      '@emotion/cache': path.resolve(
        __dirname,
        'node_modules/@emotion/cache'
      ),
      '@mui/styled-engine': path.resolve(
        __dirname,
        'node_modules/@emotion/styled'
      )
    }
  },
  optimizeDeps: {
    include: [
      '@emotion/react',
      '@emotion/styled',
      '@emotion/cache',
      '@mui/material',
      '@mui/icons-material',
      '@mui/system',
    ],
    force: true,
  },

  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.jsx'),
      name: 'Ledger',
      fileName: (format) => `index.${format === 'es' ? 'es' : 'cjs'}.js`,
      formats: ['es', 'cjs']
    },
    rollupOptions: {
      external: [
        /^react.*/,
        /^redux.*/,
        'redux-api-middleware',
        'react-intl',
        'react-helmet',
        'react-multi-date-picker',
        'prop-types',
        /^react-date-object.*/,
        'nepali-date-converter',
        'moment',
        /^lodash.*/,
        'lodash-uuid',
        'classnames',
        'clsx',
        'react-autosuggest',
        'history',
        /^@emotion\/react/,
        /^@emotion\/styled/,
        /^@emotion\/cache/,
        /^@mui\/material.*/,
        /^@mui\/icons-material.*/,
        /^@mui\/system.*/,
        /^@mui\/styles.*/,
        '@mui/styled-engine',
        '@date-io/core',
        '@date-io/moment',
        'zxcvbn',
        'flat',

        /^@babel-.*/,
        /^@date-io\/.*/,
        /^@openimis.*/
      ],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react/jsx-runtime': 'jsxRuntime',
          'react/jsx-dev-runtime': 'jsxDevRuntime',
          '@emotion/react': 'EmotionReact',
          '@emotion/styled': 'EmotionStyled',
          '@mui/material': 'MuiMaterial',
        }
      }
    },
    sourcemap: true,
    outDir: 'dist',
    emptyOutDir: true
  },
  ssr: {
    noExternal,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setupTests.js'],
    include: ['tests/**/*.test.{js,jsx}', 'src/**/*.test.{js,jsx}'],
    alias: {
      '@openimis/fe-core': path.resolve(__dirname, 'tests/mocks/feCore.jsx'),
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/**/*.test.{js,jsx}', 'src/index.jsx'],
    },
  },
});
