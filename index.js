const express = require('express')
const path = require('path')
const PORT = process.env.PORT || 5000
const fs = require("fs");
const indexHtmlPath = path.join(__dirname, './dist/index.html');
const indexHtmlExist = fs.existsSync(indexHtmlPath);
const execa = require('execa');

try {
    execa.shellSync(`node ${path.join(__dirname, './node_modules/gulp/bin/gulp.js')}`);
    console.log('launch express app');
} catch (error) {
    console.error(error);
}
express()
  .use(express.static(path.join(__dirname, 'dist')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (req, res) => indexHtmlExist ? res.sendFile(indexHtmlPath) : res.send('missing index'))
  .listen(PORT, () => console.log(`Listening on ${ PORT }`))
