var gulp = require("gulp");
var util = require('util');
var glob = require("glob")
var rename = require('gulp-rename');
var jest = require('gulp-jest');
var stripCode = require('gulp-strip-code');
var uglify = require('gulp-uglify');
var plumber = require("gulp-plumber");

var paths = {
	srcJs : 'src/**/*.js',
	destJs : 'dist',
	testSrc : 'test',
	testSrcJs : 'test/*.js',
	manualTest : '!test/manual/**/*.js'
};

gulp.task("default", function() {
	gulp.start('buildJs');

	// watch for changes
	gulp.watch([ paths.srcJs ], function() {
		gulp.start('buildJs');
	});
});

/**
 * Build js
 */
gulp.task('buildJs', function() {
	return gulp.src(paths.srcJs).pipe(plumber(function(error) { // avoid exiting
		// loop on error
		util.log(error.message);
	})).pipe(stripCode({ // remove test code
		start_comment : "start-test-code",
		end_comment : "end-test-code"
	})).pipe(uglify({
		preserveComments : 'license'
	})) // minimize
	.pipe(rename('ReactiveGauge.min.js')).pipe(gulp.dest(paths.destJs));
});

/**
 * Test task
 */
gulp.task('test', function() {
	gulp.src(paths.testSrcJs).pipe(jest({
		verbose : true,
		unmockedModulePathPatterns : [ "node_modules/*" ],
		testDirectoryName : paths.testSrc
	}));
});
