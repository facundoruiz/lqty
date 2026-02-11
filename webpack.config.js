const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const Dotenv = require('dotenv-webpack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const gaMeasurementId = process.env.GA_MEASUREMENT_ID || '';

module.exports = {
  mode: 'development',  entry: {
    main: './src/index.js',
    login: './src/js/auth/login.js',
    register: './src/js/auth/register.js',
    dashboard: './src/js/dashboard.js',
    admin: './src/js/admin.js',
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
    assetModuleFilename: 'asset/[name][ext]'
  },
  devServer: {
    static: './dist',
    hot: true,
  },
  module: {
    rules: [
      {
        test: /\.scss$/i,
        use: [
          MiniCssExtractPlugin.loader,
          { loader: 'css-loader', options: { importLoaders: 1 } },
          'sass-loader'
        ]
      },
      {
        test: /\.css$/i,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader'
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
  plugins: [
    new Dotenv(),
    new MiniCssExtractPlugin({
      filename: 'styles/[name].css',
    }),
    new HtmlWebpackPlugin({
      template: './src/index.html',
      filename: 'index.html',
      chunks: ['main'],
      templateParameters: { GA_MEASUREMENT_ID: gaMeasurementId },
      favicon: './src/img/favicon-32x32.png',
    }),
    new HtmlWebpackPlugin({
      template: './src/login.html',
      filename: 'login.html',
      chunks: ['login'],
      templateParameters: { GA_MEASUREMENT_ID: gaMeasurementId },
      favicon: './src/img/favicon-32x32.png',
    }),
    new HtmlWebpackPlugin({
      template: './src/register.html',
      filename: 'register.html',
      chunks: ['register'],
      templateParameters: { GA_MEASUREMENT_ID: gaMeasurementId },
      favicon: './src/img/favicon-32x32.png',
    }),
    new HtmlWebpackPlugin({
      template: './src/dashboard.html',
      filename: 'dashboard.html',
      chunks: ['dashboard'],
      templateParameters: { GA_MEASUREMENT_ID: gaMeasurementId },
      favicon: './src/img/favicon-32x32.png',
    }),
    new HtmlWebpackPlugin({
      template: './src/admin.html',
      filename: 'admin.html',
      chunks: ['admin'],
      templateParameters: { GA_MEASUREMENT_ID: gaMeasurementId },
      favicon: './src/img/favicon-32x32.png',
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
        }, {
          from: "./src/site.webmanifest",
          to: "manifest.json",
         
        }
      ],
    }),
  ],
};
