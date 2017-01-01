'use strict';

// const
const PORT = '3600';
const FALLBACK = '404.html';

const HTTP_PATH = './public/';
const DEST_PATH = './public/';
const SRC_PATH = './src/';
const CONFIG_PATH = './config/';
const DEST_HTML = DEST_PATH;
const DEST_CSS = `${DEST_PATH}css/`;
const DEST_JS = `${DEST_PATH}js/`;
const SRC_PUG = `${SRC_PATH}pug/`;
const SRC_SASS = `${SRC_PATH}sass/`;
const SRC_JS = `${SRC_PATH}js/`;
const GLOB_UNBUILD = '!' + `${SRC_PATH}**/_**`;
const GLOB_PUG = `${SRC_PUG}**/*.pug`;
const GLOB_SASS = `${SRC_SASS}**/*.sass`;
const GLOB_SCSS = `${SRC_SASS}**/*.scss`;
const GLOB_JS = `${SRC_JS}**/*.js`;
const GLOB_CONFIG = `${CONFIG_PATH}**/*`;

const config = {
  site: require(`${CONFIG_PATH}site.js`),
  jsCopy: require(`${CONFIG_PATH}js-copy.js`),
  browserify: require(`${CONFIG_PATH}browserify.js`),
  pleeease: require(`${CONFIG_PATH}pleeease.js`),
  eslintrcPath: `${CONFIG_PATH}eslintrc.json`,
};


// import
import gulp from 'gulp';
import plumber from 'gulp-plumber';
import sass from 'gulp-sass';
import pleeease from 'gulp-pleeease';
import pug from 'gulp-pug';
import watch from 'gulp-watch';
import webserver from 'gulp-webserver';
import uglify from 'gulp-uglify';
import gutil from 'gulp-util';
import rename from 'gulp-rename';
import browserify from 'browserify';
import watchify from 'watchify';
import source from 'vinyl-source-stream';
import buffer from 'vinyl-buffer';
import babelify from 'babelify';
import gulpif from 'gulp-if';
import gulpIgnore from 'gulp-ignore';
import notify from 'gulp-notify';
import eslint from 'gulp-eslint';


// tasks
gulp.task('default',['build', 'server', 'watch']);
gulp.task('build', ['html', 'css', 'js']);
gulp.task('html', ['pug']);
gulp.task('css', ['sass']);
gulp.task('js', ['lint', 'browserify', 'js-copy']);

gulp.task('watch', () => {
  watch(GLOB_PUG, () => {
    gulp.start('pug');
  });
  watch(GLOB_JS, () => {
    gulp.start(['lint', 'js-copy']);
  });
  watch([GLOB_SASS, GLOB_SCSS], () => {
    gulp.start('sass');
  });
  gulp.start('watchify');
});

gulp.task('server', () => {
  gulp.src(HTTP_PATH)
    .pipe(webserver({
      // directoryListing: true,
      host: '0.0.0.0',
      port: (gutil.env.port || PORT),
      fallback: FALLBACK,
    })
  );
});

gulp.task('pug', () => {
  gulp.src([GLOB_PUG, GLOB_UNBUILD])
    .pipe(plumber({ errorHandler: notify.onError('<%= error.message %>') }))
    .pipe(pug({
      locals: config.site,
      pretty: true
    }))
    .pipe(rename((path) => {
      // ex. hoge.pug -> hoge.html
      // ex. hoge__.pug -> hoge/index.html
      // ex. hoge__fuga.pug -> hoge/fuga.html
      // ex. hoge__fuga__.pug -> hoge/fuga/index.html
      if (!!path.basename.match(/__$/)) {
        path.dirname += '/' + path.basename.replace(/__/g, '/');
        path.basename = 'index';
      }
      else {
        let ary = path.basename.split('__');
        let base = ary.pop();
        let dir = ary.join('/');
        path.dirname += '/' + dir;
        path.basename = base;
      }
    }))
    .pipe(gulp.dest(DEST_HTML));
});

gulp.task('sass', () => {
  gulp.src([GLOB_SASS, GLOB_SCSS, GLOB_UNBUILD])
    .pipe(plumber({ errorHandler: notify.onError('<%= error.message %>') }))
    .pipe(sass())
    .pipe(pleeease(config.pleeease))
    .pipe(gulp.dest(DEST_CSS));
});

gulp.task('js-copy', () => {
  gulp.src(config.jsCopy.files)
    .pipe(plumber({ errorHandler: notify.onError('<%= error.message %>') }))
    .pipe(gulpif(!gutil.env.develop, uglify({ preserveComments: 'some' }))) // developモードではminifyしない
    .pipe(gulp.dest(DEST_JS));
});

gulp.task('browserify', () => {
  bundleJs();
});

gulp.task('watchify', () => {
  bundleJs(true);
});

gulp.task('lint', () => {
  gulp.src([GLOB_JS, GLOB_UNBUILD])
    .pipe(plumber({ errorHandler: notify.onError('<%= error.message %>') }))
    .pipe(eslint(config.eslintrcPath))
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
});


function bundleJs(watching = false) {
  const b = browserify({
    entries: config.browserify.entries,
    transform: [babelify],
    plugin: watching ? [watchify] : null,
  });
  b.on('update', () => {
    console.log('scripts update...');
    bundler();
  });
  function bundler() {
    return b.bundle()
      .on('error', notify.onError('<%= error.message %>'))
      .pipe(source(config.browserify.dest))
      .pipe(buffer())
      .pipe(gulpif(!gutil.env.develop, uglify({ preserveComments: 'some' }))) // developモードではminifyしない
      .pipe(gulp.dest(DEST_JS))
      .pipe(notify('scripts bundle completed!'));
  }
  return bundler();
}
