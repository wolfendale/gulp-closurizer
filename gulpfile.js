var gulp		= require('gulp'),
	compiler 	= require('./index.js')({

		compiler_level	: 'ADVANCED_OPTIMIZATIONS',
		angular_pass	: null
	}, true);

gulp.task('default', function() {

	gulp.src('src/*.*')
	.pipe(compiler)
	.pipe(gulp.dest('output/'));
})