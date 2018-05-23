const express = require('express')
const path = require('path')
const PORT = process.env.PORT || 5000
const fs = require("fs");
const indexHtmlPath = path.join(__dirname, './dist/index.html');
const indexHtmlExist = fs.existsSync(indexHtmlPath);

express()
  .use(express.static(path.join(__dirname, 'dist')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (req, res) => indexHtmlExist ? res.sendFile(indexHtmlPath) : res.send('missing index'))
  .listen(PORT, () => console.log(`Listening on ${ PORT }`))
