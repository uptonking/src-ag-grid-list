// default webpack config for dev, build & storybook

const path = require('path');

module.exports = {
  // entry: './src/index.ts',
  entry: path.join(__dirname, './src/index.ts'),
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'build'),
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [],
  resolve: {
    extensions: ['.ts', '.tsx', '.js', 'jsx'],
  },
  mode: 'development',
  devtool: 'eval-source-map',
  devServer: {
    contentBase: path.resolve(__dirname, 'public'),
    compress: true,
    host: '0.0.0.0',
    port: 8999,
    // open: true,
  },
};
