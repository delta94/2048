import { parse } from 'url';
import { resolve } from 'path';

import { argv } from 'yargs';
import * as webpack from 'webpack';
import * as magicImporter from 'node-sass-magic-importer';
import * as ExtractTextPlugin from 'extract-text-webpack-plugin';
import * as BrowserSyncPlugin from 'browser-sync-webpack-plugin';
import * as CleanWebpackPlugin from 'clean-webpack-plugin';
import { Options as BrowsersyncOptions } from 'browser-sync';

import * as cssnano from 'cssnano';
import * as postcssURL from 'postcss-url';
import * as autoprefixer from 'autoprefixer';
import * as postcssUtilities from 'postcss-utilities';
import * as postcssEasyImport from 'postcss-easy-import';
import * as postcssMergeRules from 'postcss-merge-rules';
import * as postcssWatchFolder from 'postcss-watch-folder';
import * as postcssFlexbugsFixed from 'postcss-flexbugs-fixes';

interface ISourceMap {
	sourceMap: boolean;
}

interface IObjectsArray {
	plugins: any;
	sourceMap?: boolean;
}

const sourceMap: ISourceMap = {
	sourceMap: (argv.env as any).NODE_ENV === 'development'
};

const postcssConfig: IObjectsArray = {
	plugins: [postcssURL({ url: 'rebase' }), autoprefixer(), postcssUtilities, postcssEasyImport, postcssFlexbugsFixed],
	...sourceMap
};

const browserSyncConfig: BrowsersyncOptions = {
	host: 'localhost',
	port: 3000,
	open: 'external',
	files: ['**/*.php', '**/*.html', './assets/dist/app.css', './assets/dist/app.js'],
	ghostMode: {
		clicks: false,
		scroll: true,
		forms: {
			submit: true,
			inputs: true,
			toggles: true
		}
	},
	snippetOptions: {
		rule: {
			match: /<\/body>/i,
			fn: (snippet, match) => `${snippet}${match}`
		}
	},
	proxy: 'localhost'
};

const extractTextConfig: ExtractTextPlugin.PluginOptions = {
	filename: 'dist/app.css',
	allChunks: true
};

const cleanConfig = {
	verbose: false,
	exclude: ['sprite.svg']
};

module.exports = (env): webpack.Configuration => {
	const isDevelopment: boolean = env.NODE_ENV === 'development';
	const isProduction: boolean = env.NODE_ENV === 'production';

	if (isProduction) {
		postcssConfig.plugins.push(
			postcssMergeRules,
			cssnano({
				discardComments: {
					removeAll: true
				}
			})
		);
	}

	if (isDevelopment) {
		postcssConfig.plugins.push(
			postcssWatchFolder({
				folder: './assets/styles',
				main: './assets/styles/main.scss'
			})
		);
	}

	const config: webpack.Configuration = {
		mode: env.NODE_ENV,
		entry: ['./assets/styles/main.scss', './assets/scripts/main.ts'],
		output: {
			path: resolve(__dirname, './assets'),
			filename: 'dist/app.js'
		},
		resolve: {
			modules: ['node_modules', './assets/scripts', './assets/images/sprite'],
			extensions: ['.js', '.ts']
		},
		module: {
			rules: [
				{
					test: /\.scss$/,
					use: ExtractTextPlugin.extract({
						use: [
							{
								loader: 'css-loader',
								options: sourceMap
							},
							{
								loader: 'postcss-loader',
								options: postcssConfig
							},
							{
								loader: 'sass-loader',
								options: {
									sassOptions: {
										importer: magicImporter()
									},
									...sourceMap
								}
							}
						]
					})
				},
				{
					test: /\.ts$/,
					loader: 'awesome-typescript-loader'
				},
				{
					test: /\.js/,
					loader: 'source-map-loader'
				},
				{
					test: /\.(jpe?g|gif|png|svg|woff2?|ttf|eot|wav|mp3|mp4)(\?.*$|$)/,
					use: [
						{
							loader: 'file-loader',
							options: {
								name: '[hash].[ext]',
								context: '',
								publicPath: './',
								outputPath: './dist/'
							}
						}
					]
				}
			]
		},
		plugins: [
			new webpack.ProvidePlugin({
				$: 'jquery',
				jQuery: 'jquery',
				'window.jQuery': 'jquery'
			}),
			new ExtractTextPlugin(extractTextConfig),
			new CleanWebpackPlugin(['./assets/dist/'], cleanConfig)
		],
		cache: true,
		bail: false,
		devtool: isDevelopment ? 'source-map' : false,
		stats: 'errors-only'
	};

	if (isDevelopment) {
		if (env.url) {
			browserSyncConfig.host = parse(env.url).hostname;
			browserSyncConfig.proxy = env.url;
		}

		config.plugins.push(
			new BrowserSyncPlugin(browserSyncConfig, {
				reload: false
			})
		);
	}

	return config;
};
