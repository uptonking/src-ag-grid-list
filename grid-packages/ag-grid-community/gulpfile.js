const gulp = require('gulp');
const { series, parallel } = gulp;

const fs = require('fs');
const clean = require('gulp-clean');
const rename = require('gulp-rename');
const gulpTypescript = require('gulp-typescript');
const typescript = require('typescript');
const header = require('gulp-header');
const merge = require('merge2');
const pkg = require('./package.json');
const replace = require('gulp-replace');

const headerTemplate = [
  '/**',
  ' * <%= pkg.name %> - <%= pkg.description %>',
  ' * @version v<%= pkg.version %>',
  ' * @link <%= pkg.homepage %>',
  ' * @license <%= pkg.license %>',
  ' */',
  '',
].join('\n');

const dtsHeaderTemplate =
  '// Type definitions for <%= pkg.name %> v<%= pkg.version %>\n' +
  '// Project: <%= pkg.homepage %>\n' +
  '// Definitions by: Niall Crosby <https://github.com/ag-grid/>\n';

// Start of Typescript related tasks，
/** 基于gulp-typescript创建任务来编译出d.ts类型声明文件，ts源码由rollup编译 */
const tscMainTask = () => {
  const tsProject = gulpTypescript.createProject('./tsconfig-main.json', {
    typescript: typescript,
  });

  const tsResult = gulp.src('./src/main.ts').pipe(tsProject());
  // tsResult.js可以获取编译出的js，tsResult.dts可以获取类型
  return merge([
    tsResult.dts
      .pipe(replace('"@ag-grid-community/core', '"./dist/lib/main'))
      .pipe(header(dtsHeaderTemplate, { pkg: pkg }))
      .pipe(rename('main.d.ts'))
      .pipe(gulp.dest('./')),
  ]);
};

const cleanDist = () => {
  return gulp.src('dist', { read: false, allowEmpty: true }).pipe(clean());
};

// End of Typescript related tasks

const copyGridCoreStyles = (done) => {
  if (!fs.existsSync('./node_modules/@ag-grid-community/core/dist/styles')) {
    done(
      "node_modules/@ag-grid-community/core/dist/styles doesn't exist - exiting",
    );
  }

  return merge([
    gulp
      .src('./node_modules/@ag-grid-community/core/dist/styles/**/*')
      .pipe(gulp.dest('./dist/styles')),
    gulp
      .src(['./node_modules/@ag-grid-community/core/src/styles/**/*'])
      .pipe(gulp.dest('./src/styles')),
  ]);
};

const copyGridCoreTypings = (done) => {
  if (!fs.existsSync('./node_modules/@ag-grid-community/core/typings')) {
    done(
      "node_modules/@ag-grid-community/core/typings doesn't exist - exiting",
    );
  }

  return gulp
    .src('./node_modules/@ag-grid-community/core/typings/**/*')
    .pipe(gulp.dest('./dist/lib'));
};

const copyGridAllUmdFiles = (done) => {
  if (!fs.existsSync('./node_modules/@ag-grid-community/all-modules/dist')) {
    done(
      "./node_modules/@ag-grid-community/all-modules/dist doesn't exist - exiting",
    );
  }

  return gulp
    .src([
      './node_modules/@ag-grid-community/all-modules/dist/ag-grid-community*.js',
      '!./node_modules/@ag-grid-community/all-modules/dist/**/*.cjs*.js',
    ])
    .pipe(gulp.dest('./dist/'));
};

// copy from grid-core tasks
gulp.task('copy-grid-core-styles', copyGridCoreStyles);
gulp.task('copy-umd-files', copyGridAllUmdFiles);
gulp.task('copy-core-typings', copyGridCoreTypings);

// Typescript related tasks
gulp.task('clean', cleanDist);
gulp.task('tsc-no-clean', tscMainTask);
gulp.task('tsc', series('clean', 'tsc-no-clean'));

// webpack related tasks，这里只编译d.ts类型声明文件
gulp.task(
  'package',
  series('tsc', 'copy-grid-core-styles', 'copy-umd-files', 'copy-core-typings'),
);

// default/release task
gulp.task('default', series('package'));
