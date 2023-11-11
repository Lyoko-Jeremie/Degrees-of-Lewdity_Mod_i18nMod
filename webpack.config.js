// Generated using webpack-cli https://github.com/webpack/webpack-cli

const path = require('path');
const fs = require('fs');
// const HtmlWebpackPlugin = require('html-webpack-plugin');

const isProduction = process.env.NODE_ENV == 'production';


const stylesHandler = 'style-loader';

const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

// const ZipPlugin = require('zip-webpack-plugin');

const webpack = require('webpack');

const config = {
  entry: './src/init.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'i18nLoad.js',
  },
  devtool: 'inline-source-map',
  target: 'web',
  // devServer: {
  //   open: true,
  //   host: '0.0.0.0',
  //   port: 3000,
  // },
  plugins: [
    // new HtmlWebpackPlugin({
    //   template: 'src/web/1.html',
    // }),
    new ForkTsCheckerWebpackPlugin({
      typescript: {
        configFile: 'src/tsconfig.json',
        memoryLimit: 4096,
      },
    }),

    // new webpack.BannerPlugin({
    //   banner: fs.readFileSync('./src/GreasemonkeyScript/gm_front.txt', {encoding: 'utf-8'}),
    //   raw: true,
    // }),
  ],
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/i,
        loader: 'ts-loader',
        exclude: ['/node_modules/'],
      },
      // {
      //   test: /\.css$/i,
      //   use: [stylesHandler, 'css-loader'],
      // },
      // {
      //   test: /\.s[ac]ss$/i,
      //   use: [stylesHandler, 'css-loader', 'sass-loader'],
      // },
      {
        test: /\.(eot|svg|ttf|woff|woff2|png|jpg|gif)$/i,
        type: 'asset',
      },

      // https://stackoverflow.com/questions/42631645/webpack-import-typescript-module-both-normally-and-as-raw-string
      {
        // test: /.*\/inlineText\/.*/,
        resourceQuery: /inlineText/,
        type: 'asset/source',
      },
      // {
      //   test: /src\/inlineText\/GM\.css/,
      //   use: 'raw-loader',
      // },

      // Add your rules for custom modules here
      // Learn more about loaders from https://webpack.js.org/loaders/
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.jsx', '.js', '...'],
    plugins: [new TsconfigPathsPlugin({
      configFile: 'src/tsconfig.json',
    })],
    alias: {
      // GM_config: './src/libs/GM_config/gm_config.js',
    },
    fallback: {
      // for libsodium
      // only in browser
      crypto: false,
    },
  },
};

module.exports = () => {
  if (isProduction) {
    config.mode = 'production';


  } else {
    config.mode = 'development';
  }
  return config;
};
