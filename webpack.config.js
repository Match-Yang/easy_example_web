const path = require('path');

module.exports = {
  devServer: {
    // https: true,
    static: {
      directory: path.join(__dirname, 'public'),
    },
    compress: true,
    port: 9000,
  },
  mode: process.env.mode,
  entry: './src/ZegoExpressManager.ts',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      }
    ]
  },
  resolve: {
    extensions: [ '.tsx', '.ts', '.js'],
  },
  output: {
    filename: 'ZegoExpressManager.js',
    path: path.resolve(__dirname, 'public'),
    library: {
      type: 'umd',
      umdNamedDefine: true,
    },
    globalObject: "typeof self !== 'undefined' ? self : this",
  }
};