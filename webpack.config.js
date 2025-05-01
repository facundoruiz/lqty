const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const Dotenv = require('dotenv-webpack');
<<<<<<< HEAD
const fs = require('fs');
const ImageMinimizerPlugin = require('image-minimizer-webpack-plugin');

// Función para verificar si un directorio existe
function directoryExists(dir) {
  try {
    return fs.existsSync(dir) && fs.statSync(dir).isDirectory();
  } catch (err) {
    return false;
  }
}

// Configurar patrones de copia basados en directorios existentes
const copyPatterns = [
  { 
    from: './src/img', 
    to: 'img',
    noErrorOnMissing: true
  }
];

// Verificar y agregar patrones de copia para directorios de uploads si existen
const uploadDirs = [
  'images',
  'blogs',
  'products'
];

uploadDirs.forEach(dir => {
  const uploadPath = `./src/uploads/${dir}`;
  if (directoryExists(uploadPath)) {
    copyPatterns.push({
      from: uploadPath,
      to: `uploads/${dir}`,
      noErrorOnMissing: true
    });
  }
});

// Verificar y agregar index.html de uploads si existe
const uploadIndexPath = './src/uploads/index.html';
if (directoryExists(path.dirname(uploadIndexPath))) {
  copyPatterns.push({
    from: uploadIndexPath,
    to: 'uploads',
    noErrorOnMissing: true
  });
}

// Verificar y agregar manifest.json si existe
const manifestPath = './src/site.webmanifest';
if (fs.existsSync(manifestPath)) {
  copyPatterns.push({
    from: manifestPath,
    to: 'manifest.json',
    noErrorOnMissing: true
  });
}
=======
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
>>>>>>> 923eb31 (feat: Add Firebase configuration and initialize Firestore)

module.exports = {
  mode: 'development',
  entry: './src/index.js',
  output: {
    filename: '[name].[contenthash].js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
    assetModuleFilename: 'asset/[name][ext]'
  },
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
        firebase: {
          test: /[\\/]node_modules[\\/](firebase)[\\/]/,
          name: 'firebase',
          chunks: 'all',
          priority: 10,
        },
      },
    },
    runtimeChunk: 'single',
  },
  devServer: {
    static: './dist',
    hot: true,
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
        use: [
          {
            loader: 'image-webpack-loader',
            options: {
              mozjpeg: {
                progressive: true,
                quality: 65
              },
              optipng: {
                enabled: true,
              },
              pngquant: {
                quality: [0.65, 0.90],
                speed: 4
              },
              gifsicle: {
                interlaced: false,
              },
              webp: {
                quality: 75
              }
            }
          }
        ]
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
      favicon: './src/img/favicon-32x32.png',
    }),
    new CopyWebpackPlugin({
<<<<<<< HEAD
      patterns: copyPatterns
    }),
    new ImageMinimizerPlugin({
      generator: [
        {
          preset: 'webp',
          implementation: ImageMinimizerPlugin.imageminGenerate,
          options: {
            plugins: ['imagemin-webp'],
          },
=======
      patterns: [
        { 
          from: './src/img', 
          to: 'asset/img' 
>>>>>>> 923eb31 (feat: Add Firebase configuration and initialize Firestore)
        },
        {
          type: 'asset',
          implementation: ImageMinimizerPlugin.imageminGenerate,
          options: {
            plugins: [
              ['mozjpeg', { quality: 65 }],
              ['optipng', { optimizationLevel: 5 }],
              ['gifsicle', { interlaced: true }],
              ['svgo', { plugins: [{ removeViewBox: false }] }],
            ],
          },
        },
      ],
    }),
  ],
};