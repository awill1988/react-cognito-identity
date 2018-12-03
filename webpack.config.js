const pkg = require('./package.json');
const production = process.env.NODE_ENV === 'production';
const path = require('path');
const basePath = path.join(__dirname);
const devServer = require('./devserver');
const UglifyJsPlugin = require('webpack-uglify-js-plugin');

module.exports = {
  stats: {
    colors: {
      green: '\u001b[32m'
    }
  },
  entry: production ? {
    bundle: './src/index.js',
    vendor: Object.keys(pkg.dependencies)
  } : [
    'react-hot-loader/patch',
    './src/index.js'
  ],
  resolve: {
    extensions: ['.js', '.json', '.jsx'],
    alias: {
      '@': path.join(basePath, 'src')
    }
  },
  output: {
    path: path.join(basePath, 'dist'),
    filename: production ? '[name]-[hash].js' : 'index.js',
    chunkFilename: production ? '[name]-[hash].chunk.js' : '[name].js'
  },
  devtool: !production ? 'inline-source-map': false,
  devServer,
  optimization: {
    minimizer: [
      // we specify a custom UglifyJsPlugin here to get source maps in production
      new UglifyJsPlugin({
        cache: false,
        parallel: true,
        cacheFolder: '~/.tmp',
        uglifyOptions: {
          compress: false,
          ecma: 6,
          mangle: true
        },
        sourceMap: false
      })
    ]
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ["env", "react", "es2015", "stage-0"],
            plugins: ["react-hot-loader/babel"]
          }
        }
      },
      {
        test: /\.js$/,
        enforce: 'pre',
        exclude: /node_modules/,
        use: {
          loader: 'eslint-loader',
          options: {
            configFile: __dirname + '/.eslintrc'
          },
        }
      }
    ]
  }
};
