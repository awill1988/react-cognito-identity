import babel from 'rollup-plugin-babel';
import {eslint} from 'rollup-plugin-eslint';
import resolve from 'rollup-plugin-node-resolve';
import external from 'rollup-plugin-peer-deps-external'
import commonjs from 'rollup-plugin-commonjs';
import { uglify } from 'rollup-plugin-uglify';
import { plugin as analyze } from 'rollup-plugin-analyzer'
import pkg from './package.json';

export default [
  {
    input: 'src/index.js',
    output: [
      {
        file: `lib/${pkg.browser}`,
        format: 'cjs',
        sourcemap: true
      },
      {
        file: `lib/${pkg.module}`,
        format: 'es',
        sourcemap: true,
      },
      {
        file: `lib/${pkg.main}`,
        format: 'umd',
        name: 'react-cognito-identity',
        sourcemap: false,
        exports: 'named',
      },
    ],
    plugins: [
      external(),
      eslint({
        exclude: [
          '**/*.css',
        ]
      }),
      babel({
        exclude: 'node_modules/**'
      }),
      resolve(),
      commonjs({
        ignore: [
          'react',
          'react-dom/server',
          'prop-types',
          '@aws-amplify/auth',
        ],
      })
    ],
  },
  // for filesize
  {
    input: `lib/${pkg.browser}`,
    output: {
      file: 'lib/bundlesize.js',
      format: 'cjs',
      exports: 'named',
    },
    plugins: [
      resolve(),
      commonjs({
        ignore: [
          'react',
          'react-dom/server',
          'prop-types',
          '@aws-amplify/auth'
        ],
      }),
      uglify(),
      analyze(),
    ],
  },
];
