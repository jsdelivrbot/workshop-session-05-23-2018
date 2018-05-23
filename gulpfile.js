const gulp = require('gulp');
const flatten = require('gulp-flatten');
const gutil = require('gulp-util');
const runSequence = require('run-sequence');
const browserSync = require('browser-sync');
const historyApiFallback = require('connect-history-api-fallback')
const plumber = require('gulp-plumber');
const cssnano = require('gulp-cssnano');
const fs = require("fs");
const inject = require('gulp-inject-string');
const reload = browserSync.reload;
const include = require('gulp-html-tag-include');
const stylus = require('gulp-stylus');
const path = require('path');
const del = require('del');
const mustache = require("gulp-mustache");
const rename = require("gulp-rename");
const gulpMerge = require('gulp-merge');
const yaml = require('js-yaml')
const through = require('through2');
const PluginError = require('plugin-error')
const replaceExtension = require('replace-ext')
const escapeRegex = require('escape-string-regexp');
const Mustache = require("mustache");
const R = require("ramda");

const assets = function () {
  gulp.src("./src/assets/**/*")
    .pipe(flatten())
    .pipe(gulp.dest('dist/assets'));
}

const getMustacheData = function (file) {
  const files = [
    [path.join(path.dirname(file.path), 'data.js'), (filepath) => {
      return {
        data: require(require.resolve(filepath))
      };
    }],
    [path.join(path.dirname(file.path), 'data.yaml'), (filepath) => {
      return {
        data: yaml.safeLoad(fs.readFileSync(filepath, 'utf8'))
      };
    }],
    [path.join(path.dirname(file.path), 'data.json'), (filepath) => {
      return {
        data: JSON.parse(fs.readFileSync(filepath, 'utf8'))
      };
    }],
  ];
  const arrayLength = files.length;
  for (var i = 0; i < arrayLength; i++) {
    const filepath = files[i][0];
    if (fs.existsSync(filepath)) {
      try {
        return files[i][1](filepath);
      } catch(e) {
        return {
          error: new gutil.PluginError("ERROR", `while reading json file ${filepath} \n ${e.stack}`)
        }
      }
    }
  }
  return {};
}

const getCssContent = (filepath) => fs.existsSync(filepath) ? fs.readFileSync(filepath, "utf8") : '';

const html = function () {
  gulp.src("./src/html/*.html")
      .pipe(include())
      .pipe(inject.after('style amp-custom>', getCssContent(path.join(__dirname, 'dist/css/main.css'))))
      .pipe(inject.after('style amp-custom>', getCssContent(path.join(__dirname, 'dist/css/page.css'))))
      .pipe(gulp.dest("./dist")).on('end', assets)
      .pipe(reload({
          stream: true
      }));
}

gulp.task('cleanup', function(done) {
  del([
    './dist/*'
  ]).then(paths => {
      console.log('Deleted files and folders:\n', paths.join('\n'));
      done();
  });
});

gulp.task('mustache', ['stylus'], function() {
    gulpMerge(
      gulp.src(["./src/*.mustache", "./src/*.html"], { base: path.join(__dirname, 'src/')}),
      gulp.src([
        "./examples/**/*.mustache",
        "./examples/**/*.html",
      ], { base: path.join(__dirname)})
    )
    .pipe(plumber())
    .pipe((function () {
    	return through.obj(function (file, encoding, callback) {
    		if (file.isNull()) {
    			return callback(null, file);
    		}

    		if (file.isStream()) {
    			return callback(new gutil.PluginError("gulp-filechange", "Streaming not supported."));
    		}

        const templateData = getMustacheData(file);

        if(templateData.error) {
          return callback(templateData.error);
        }

        const contentData = require('./src/content.json');

        file.data = R.merge(templateData.data, contentData);
        fs.writeFileSync(path.join(__dirname, './cached-data.json'), JSON.stringify(file.data, null, '\t'))

    		callback(null, file);
    	});
    })())
    .pipe(mustache(null, {
      extension: '.html'
    }))
    .pipe(gulp.dest('./dist')).on('end', html);
});

gulp.task('stylus', function() {
  return gulp.src('./src/css/*.styl', { base: path.join(__dirname, 'src/')})
    .pipe(plumber())
    .pipe(stylus({
      'include css': true
    }))
    .pipe(cssnano())
});

gulp.task('compile', [
 'mustache'
], () => {});

const gulpAmpValidator = require('gulp-amphtml-validator');

gulp.task('validate-amp-html', () => {
    gulp.src('src/**/*.html')
        // Validate the input and attach the validation result to the "amp" property
        // of the file object.
        .pipe(gulpAmpValidator.validate())
        // Print the validation results to the console.
        .pipe(gulpAmpValidator.format())
        // Exit the process with error code (1) if an AMP validation error
        // occurred.
        .pipe(gulpAmpValidator.failAfterError());
});

gulp.task('serve', ['compile'], function () {
    browserSync({
        server: {
            baseDir: ['.tmp', 'dist'],
            middleware: [historyApiFallback()]
        },
        notify: false
    });

    gulp.watch(['src/**/*'], function (callback) { runSequence('compile', reload) });
});


gulp.task('default', function (callback) { runSequence('cleanup', 'compile', callback) });
