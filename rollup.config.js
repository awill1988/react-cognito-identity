import commonjs from 'rollup-plugin-commonjs';
import node from 'rollup-plugin-node-resolve';
import { uglify } from 'rollup-plugin-uglify';
import replace from 'rollup-plugin-replace';
import { plugin as analyze } from 'rollup-plugin-analyzer'

function onwarn(message) {
  const suppressed = ['UNRESOLVED_IMPORT', 'THIS_IS_UNDEFINED'];

  if (!suppressed.find(code => message.code === code)) {
    return console.warn(message.message);
  }
}

export default [
  // for browser
  {
    input: 'lib/browser.js',
    output: {
      file: 'lib/react-cognito-identity.browser.umd.js',
      format: 'umd',
      name: 'react-cognito-identity',
      sourcemap: true,
      exports: 'named',
    },
    onwarn,
  },
  // for server
  {
    input: 'lib/index.js',
    output: {
      file: 'lib/react-cognito-identity.umd.js',
      format: 'umd',
      name: 'react-cognito-identity',
      sourcemap: false,
      exports: 'named',
    },
    onwarn,
  },
  // for filesize
  {
    input: 'lib/react-cognito-identity.browser.umd.js',
    output: {
      file: 'dist/bundlesize.js',
      format: 'cjs',
      exports: 'named',
    },
    plugins: [
      node(),
      commonjs({
        ignore: [
          'react',
          'react-dom/server',
          '@aws-amplify/auth',
          '@aws-amplify/core',
        ],
      }),
      replace({
        'process.env.NODE_ENV': JSON.stringify('production'),
      }),
      uglify(),
      analyze(),
    ],
    onwarn,
  },
];