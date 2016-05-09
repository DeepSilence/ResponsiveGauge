var gulp = require("gulp");
var util = require('util');
var glob = require("glob")
var rename = require('gulp-rename');
var jest = require('gulp-jest');
var stripCode = require('gulp-strip-code');
var uglify = require('gulp-uglify');
var cssmin = require('gulp-cssmin');
var plumber = require("gulp-plumber");
var fs = require('fs');
var replace = require("replace");

var paths = {
	srcJs : 'src/**/*.js',
	srcCss : 'src/**/*.css',
	destCss : 'dist',
	testSrc : 'test',
	testSrcJs : 'test/*.js',
	distribution : 'dist/',
	minifiedCss : 'ResponsiveGauge.min.css',
	minifiedJs : 'ResponsiveGauge.min.js',
	manualTest : '!test/manual/**/*.js'
};

/**
 * Function to avoid exiting on errors
 */
function writeErrors() {
	return plumber(function(error) {
		util.log(error.message);
	});
}

gulp.task("default", function() {
	gulp.start('buildJs');

	// watch for changes
	gulp.watch([ paths.srcJs, paths.srcCss ], function() {
		gulp.start('buildJs');
	});
});

/**
 * Build js, css, and merge everything into a single file
 */
gulp.task('buildJs', function() {
	var dist = paths.distribution;
	var tempFile = 'ResponsiveGauge.tmp.js';
	var finalFile = dist + paths.minifiedJs;

	// Build Css
	gulp.start('buildCss');

	// Build Js
	gulp.src(paths.srcJs)//
	.pipe(writeErrors())//
	.pipe(stripCode({ // remove test code
		start_comment : "start-test-code",
		end_comment : "end-test-code"
	})).pipe(uglify({
		preserveComments : 'license'
	})) // minimize
	.pipe(rename(tempFile)).pipe(gulp.dest(dist));

	// Merge Js and CSS in final file
	var css = fs.readFileSync(dist + paths.minifiedCss);
	replace({
		regex : '#!#CSS#!#',
		replacement : css,
		silent : true,
		paths : [ dist + tempFile ]
	});
	fs.writeFileSync(finalFile, fs.readFileSync(dist + tempFile));

	fs.unlinkSync(dist + tempFile);
	fs.unlinkSync(dist + paths.minifiedCss);
});

/**
 * Build css
 */
gulp.task('buildCss', function() {
	return gulp.src(paths.srcCss)//
	.pipe(writeErrors())//
	.pipe(cssmin()) // minimize
	.pipe(rename(paths.minifiedCss)).pipe(gulp.dest(paths.destCss));
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