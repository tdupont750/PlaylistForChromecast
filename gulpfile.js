var gulp = require('gulp');
var ts = require('gulp-typescript');
var merge = require('merge2');
var sass = require('gulp-sass');

gulp.task('build', function () {
  compileScripts();
  compileSass();
});

gulp.task('scripts', compileScripts);

gulp.task('sass', compileSass);
 
gulp.task('watch', function () {
  gulp.watch('*.scss', ['sass']);
  gulp.watch('*.ts', ['scripts']);
});

function compileScripts() {
  var tsResult = gulp
    .src('./src/ts/*.ts')
    .pipe(ts({
        declarationFiles: false,
        noExternalResolve: true,
        noImplicitAny: true,
        removeComments: true,
        target: "ES6",
        out: 'playlist.js'
      }));
 
  return merge([
      tsResult.dts.pipe(gulp.dest('./release/definitions')),
      tsResult.js.pipe(gulp.dest('./release/js'))
    ]);
}

function compileSass() {
  gulp.src('*.scss')
    .pipe(sass.sync().on('error', sass.logError))
    .pipe(gulp.dest('./release/css'));
}