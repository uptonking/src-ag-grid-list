// default webpack config for demo

const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');

module.exports = {
  entry: path.join(__dirname, '../src/render.tsx'),
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, '../dist'),
  },
  module: {
    rules: [
      {
        test: /\.(ts|js)x?$/,
        use: 'babel-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.(sa|sc|c)ss$/,
        use: ['style-loader', 'css-loader', 'sass-loader'],
      },
      {
        test: /\.js$/,
        use: 'source-map-loader',
        enforce: 'pre',
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './demo.html',
      filename: 'index.html',
    }),
    new ReactRefreshWebpackPlugin(),
    new webpack.HotModuleReplacementPlugin(),
  ],
  resolve: {
    extensions: ['.ts', '.tsx', '.js', 'jsx'],
  },
  mode: 'development',
  devtool: 'eval-source-map',
  // devServer config flags are only read by WDS but not Webpack
  // 若要使用热加载，还需要在cli上传入 --hot
  devServer: {
    contentBase: path.resolve(__dirname, '../dist'),
    host: '0.0.0.0',
    port: 8999,
    // open: true,
    compress: true,
    inline: true,
    hot: true,
    historyApiFallback: true,
  },
};
