const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { GenerateSW } = require('workbox-webpack-plugin');
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

module.exports = {
  mode: 'production',
  entry: './src/index.js',
  output: {
    filename: '[name].[contenthash].js',
    path: path.resolve(__dirname, 'public'),
    clean: true,
    assetModuleFilename: 'assets/[name][ext]'
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
    static: './public',
    hot: true,
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
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
    new HtmlWebpackPlugin({
      template: './src/index.html',
      favicon: './src/img/favicon-32x32.png',
    }),
    new CopyWebpackPlugin({
      patterns: copyPatterns
    }),
    new ImageMinimizerPlugin({
      minimizer: {
        implementation: ImageMinimizerPlugin.imageminMinify,
        options: {
          plugins: [
            ['gifsicle', { interlaced: true }],
            ['jpegtran', { progressive: true }],
            ['optipng', { optimizationLevel: 5 }],
            ['svgo', { plugins: [{ removeViewBox: false }] }],
          ],
        },
      },
      generator: [
        {
          preset: 'webp',
          implementation: ImageMinimizerPlugin.imageminGenerate,
          options: {
            plugins: ['imagemin-webp'],
          },
        },
        {
          type: 'asset',
          implementation: ImageMinimizerPlugin.imageminGenerate,
          options: {
            plugins: [
              ['jpegtran', { progressive: true }],
              ['mozjpeg', { quality: 65 }],
            ],
          },
        },
      ],
    }),
    new GenerateSW({
      clientsClaim: true,
      skipWaiting: true,
      runtimeCaching: [
        {
          urlPattern: /\.(?:png|jpg|jpeg|svg|gif)$/,
          handler: 'CacheFirst',
          options: {
            cacheName: 'images',
            expiration: {
              maxEntries: 50,
              maxAgeSeconds: 30 * 24 * 60 * 60, // 30 días
            },
          },
        },
        {
          urlPattern: /\.(?:js|css)$/,
          handler: 'StaleWhileRevalidate',
          options: {
            cacheName: 'static-resources',
          },
        },
        {
          urlPattern: /^https:\/\/firestore\.googleapis\.com/,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'api-cache',
            networkTimeoutSeconds: 10,
          },
        },
      ],
    }),
  ],
};