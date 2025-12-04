const path = require('path');
const fs = require('fs');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const packageJson = require('./package.json');

const component = packageJson.dsccViz;

console.log(`Building ${component.tsFile || component.jsFile}...`);

const cssFilePath = path.resolve(__dirname, 'src', component.cssFile || '');
const jsFilePath = path.resolve(__dirname, 'src', component.jsFile || '');

const plugins = [
  // Add DSCC_IS_LOCAL definition
  new webpack.DefinePlugin({
    DSCC_IS_LOCAL: 'true',
  }),
];

let body = '<script src="main.js"></script>';
if (fs.existsSync(cssFilePath)) {
  body = body + '\n<link rel="stylesheet" href="index.css">';
  plugins.push(new CopyWebpackPlugin([{from: cssFilePath, to: '.'}]));
}
const iframeHTML = `
<!doctype html>
<html><body>
${body}
</body></html>
`;

// Ensure dist directory exists
const distPath = path.resolve(__dirname, 'dist');
if (!fs.existsSync(distPath)) {
  fs.mkdirSync(distPath);
}

fs.writeFileSync(path.resolve(distPath, 'vizframe.html'), iframeHTML);

module.exports = [
  {
    mode: 'development',
    entry: jsFilePath,
    devServer: {
      contentBase: './dist',
    },
    output: {
      filename: 'main.js',
      path: distPath,
    },
    plugins: plugins,
  },
];
