var PORT = '3600';
var FALLBACK = '404.html';

var HTTP_PATH = './public/';
var DEST_PATH = './public/';
var SRC_PATH = './src/';
var CONFIG_PATH = './config/';
var DEST_HTML = DEST_PATH;
var DEST_CSS = DEST_PATH + 'css/';
var DEST_JS = DEST_PATH + 'js/';
var SRC_JADE = SRC_PATH + 'jade/';
var SRC_SASS = SRC_PATH + 'sass/';
var SRC_JS = SRC_PATH + 'js/';
var GLOB_UNBUILD = '!' + SRC_PATH + '**/_**';
var GLOB_JADE = SRC_JADE + '**/*.jade';
var GLOB_SASS = SRC_SASS + '**/*.scss';
var GLOB_JS = SRC_JS + '**/*.js';
var GLOB_CONFIG = CONFIG_PATH + '**/*';

var gulp = require('gulp');
var plumber = require('gulp-plumber');
var compass = require('gulp-compass');
var jade = require('gulp-jade');
var watch = require('gulp-watch');
var webserver = require('gulp-webserver');
var uglify = require('gulp-uglify');
var gutil = require('gulp-util');
var rename = require('gulp-rename');
var concat = require('gulp-concat');
var minifyCss = require('gulp-minify-css');
var gulpif = require('gulp-if');
var gulpIgnore = require('gulp-ignore');

var config = {
  concat: require(CONFIG_PATH + 'concat.js'),
  site: require(CONFIG_PATH + 'site.js'),
};

if (gutil.env.port) PORT = gutil.env.port;


// $ gulp --develop でjs,cssをminifyしない
// $ gulp --port 0000 でport指定


// tasks
gulp.task('default',['watch', 'server', 'jade', 'js', 'compass']);

gulp.task('build', ['jade', 'js', 'compass']);

gulp.task('watch',function(){
  // gulp.watch(['./src/jade/*.jade','./src/jade/**/*.jade','./src/jade/**/_*.jade'],['jade']);
  watch(GLOB_JADE,function(){
    gulp.start('jade');
  });
  watch(GLOB_JS,function(){
    gulp.start('js');
  });
  watch(GLOB_SASS,function(){
    gulp.start('compass');
  });
});

gulp.task('server',function(){
  gulp.src(HTTP_PATH)
    .pipe(webserver({
      // directoryListing: true,
      host: '0.0.0.0',
      port: PORT,
      fallback: FALLBACK,
    })
  );
});

gulp.task('jade',function(){
  gulp.src([GLOB_JADE, GLOB_UNBUILD])
    .pipe(plumber())
    .pipe(jade({
      locals: config.site,
      pretty: true
    }))
    .pipe(rename(function(path){
      if (!!path.basename.match(/^_/)) { // ex. _hoge.jade -> hoge.html
        path.basename = path.basename.replace(/^_/, '');
        return;
      }
      if (path.basename != 'index') { // ex. hoge.jade -> hoge/index.html
        path.dirname += '/' + path.basename.replace(/__/, '/'); // ex. hoge__fuga -> hoge/fuga
        path.basename = 'index';
      }
    }))
    .pipe(gulp.dest(DEST_HTML));
});

gulp.task('js',function(){
  gulp.src(config.concat.files) // concat
    .pipe(plumber())
    .pipe(concat(config.concat.dest))
    .pipe(gulpif(!gutil.env.develop, uglify({preserveComments: 'some'}))) // developモードではminifyしない
    .pipe(gulp.dest(DEST_JS));
  
  gulp.src([GLOB_JS, GLOB_UNBUILD]) // copy
    .pipe(plumber())
    .pipe(gulpIgnore.exclude(function(file){ // concatconfigにあるファイルは除く
      return config.concat.files.some(function(val){
        return (file.path.indexOf(val) >= 0);
      });
    }))
    .pipe(gulpif(!gutil.env.develop, uglify({preserveComments: 'some'}))) // developモードではminifyしない
    .pipe(gulp.dest(DEST_JS));
});

gulp.task('css', ['compass']);

gulp.task('compass',function(){
  gulp.src([GLOB_SASS, GLOB_UNBUILD])
    .pipe(plumber())
    .pipe(compass({
      config_file: './config.rb',
      css: DEST_CSS,
      sass: SRC_SASS,
    }))
    .pipe(gulpif(!gutil.env.develop, minifyCss({ advanced: false }))) // developモードではminifyしない
    .pipe(gulp.dest(DEST_CSS));
});
