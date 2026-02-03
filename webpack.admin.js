const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const Dotenv = require('dotenv-webpack');

module.exports = {
  mode: 'production',
  entry: {
    admin: './src/js/admin.js',
    login: './src/js/auth/login.js',
  },
  externals: {
    'firebase/app': 'firebase',
    'firebase/auth': 'firebase.auth',
    'firebase/firestore/lite': 'firebase.firestore',
    'firebase/firestore': 'firebase.firestore',
  },
  output: {
    filename: 'bundle.[contenthash].js',
    path: path.resolve(__dirname, 'admin'),
    clean: true,
    assetModuleFilename: 'asset/[name].[hash][ext]'
  },
  module: {
    rules: [
      {
        test: /\.(s[ac]ss|css)$/i,
        use: [
          MiniCssExtractPlugin.loader,
          { loader: 'css-loader', options: { importLoaders: 1 } },
          'sass-loader'
        ]
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif|ico)$/i,
        type: 'asset/resource',
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource',
      },
      {
        test: /\.webmanifest$/i,
        type: 'asset/resource',
        generator: {
          filename: '[name][ext]'
        },
      }
    ],
  },
  optimization: {
    moduleIds: 'deterministic',
    runtimeChunk: 'single',
    splitChunks: {
      chunks: 'all',
      maxInitialRequests: 10,
      maxAsyncRequests: 10,
      cacheGroups: {
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: -10,
        },
        firebase: {
          test: /[\\/](?:node_modules|~)[\\/](?:firebase|@firebase)[\\/]/,
          name: 'firebase',
          priority: 15,
          enforce: true,
        },
        commons: {
          test: /[\\/]src[\\/](components|utils)[\\/]/,
          name: 'commons',
          minChunks: 2,
          priority: -20,
        },
      },
    },
    minimizer: [
      new TerserPlugin({
        parallel: true,
        terserOptions: {
          compress: { drop_console: true },
        },
        extractComments: false,
      }),
      new CssMinimizerPlugin(),
    ],
  },
  plugins: [
    new Dotenv(),
    new MiniCssExtractPlugin({
      filename: 'styles/[name].[contenthash].css',
    }),
    new HtmlWebpackPlugin({
      template: './src/login.html',
      filename: 'login.html',
      chunks: ['login'],
      favicon: './src/img/favicon-32x32.png',
      minify: {
        removeAttributeQuotes: true,
        collapseWhitespace: true,
        removeComments: true
      }
    }),
    new HtmlWebpackPlugin({
      template: './src/admin.html',
      filename: 'admin.html',
      chunks: ['admin'],
      favicon: './src/img/favicon-32x32.png',
      minify: {
        removeAttributeQuotes: true,
        collapseWhitespace: true,
        removeComments: true
      }
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: './src/img',
          to: 'asset/img'
        },
        {
          from: "./src/site.webmanifest",
          to: "manifest.json",
        }
      ],
    }),
  ],
};
