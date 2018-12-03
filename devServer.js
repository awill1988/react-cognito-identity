module.exports = {
  contentBase: './src',
  historyApiFallback: true,
  host: 'localhost',
  disableHostCheck: true,
  port: 2001,
  compress: true,
  inline: true,
  hot: true,
  stats: {
    assets: true,
    children: false,
    chunks: false,
    hash: false,
    modules: false,
    publicPath: false,
    timings: true,
    version: false,
    warnings: true,
    colors: {
      green: '\u001b[32m'
    }
  }
};