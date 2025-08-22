const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const Dotenv = require('dotenv-webpack');

module.exports = {
  mode: 'production',
  entry: './src/index.js',
  output: {
    filename: 'bundle.[contenthash].js',
    path: path.resolve(__dirname, 'docs'),
    clean: true,
    assetModuleFilename: 'asset/[name].[hash][ext]'
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: [MiniCssExtractPlugin.loader, 'css-loader'],
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
    minimizer: [
      new TerserPlugin(),
      new CssMinimizerPlugin(),
    ],
  },
  plugins: [
    new Dotenv(),
    new MiniCssExtractPlugin({
      filename: 'styles/[name].[contenthash].css',
    }),
    new HtmlWebpackPlugin({
      template: './src/index.html',
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
          from: './src/uploads/images',
          to: 'uploads/images'
        },
        {
          from: './src/uploads/blogs',
          to: 'uploads/blogs'
        },
        {
          from: './src/uploads/products',
          to: 'uploads/products'
        },
        {
          from: './src/uploads/index.html',
          to: 'uploads'
        },
        {
          from: "./src/site.webmanifest",
          to: "manifest.json",
        },
        {
          from: "./src/offline.html",
          to: "offline.html",
        }
      ],
    }),
  ],
};