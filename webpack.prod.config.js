const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const Dotenv = require('dotenv-webpack');
const CompressionPlugin = require('compression-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

module.exports = {
  mode: 'production',
  entry: './src/js/index.js',
  output: {
    filename: 'bundle.[contenthash].js',
    path: path.resolve(__dirname, 'public'),
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
          test: /[\\/]node_modules[\\/]firebase[\\/]/,
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
  performance: {
    hints: 'warning',
    maxEntrypointSize: 300000,
    maxAssetSize: 300000,
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
    // Genera .gz para servir desde servidor en producción
    new CompressionPlugin({
      algorithm: 'gzip',
      test: /\.(js|css|html|svg)$/, 
      threshold: 10240,
      minRatio: 0.8,
    }),
    // Report estático para analizar el bundle (opcional)
    new BundleAnalyzerPlugin({ analyzerMode: 'static', openAnalyzer: false, reportFilename: 'bundle-report.html' }),
  ],
};