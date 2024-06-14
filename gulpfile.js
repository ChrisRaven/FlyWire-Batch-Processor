const gulp = require('gulp');
const concat = require('gulp-concat');

const files = [
  'header.js',
  'attach_dock.js',

  'constants.js',

  'json-bigint.js',
  'pickr.js',
  'connectivity.js',
  'get_labels.js',
  'get_statuses.js',
  'pool_with_retries.js',

  'actions_menu.js',
  'actions/hide.js',
  'actions/show.js',
  'actions/open_in_new_tab.js',
  'actions/remove.js',
  'actions/copy.js',
  'actions/change_color.js',
  'actions/find_common.js',
  'actions/neuropils_coverage.js',
  'actions/show_statuses_and_labels.js',
  'actions/get_synaptic_partners.js',
  'actions/get_partners_of_common.js',

  'main.js'
].map(file => 'src/' + file)

gulp.task('build', function () {
  return gulp.src(files)
    .pipe(concat('Batch-processor.user.js'))
    .pipe(gulp.dest('.'));
});

gulp.task('watch', function () {
  return gulp.watch(files, gulp.series('build'));
});

gulp.task('default', gulp.series('build', 'watch'));