var gulp		= require('gulp'),
	glob		= require('glob'),
	compiler 	= require('./index.js')({
		compiler : {
			'--compilation_level'	: 'ADVANCED_OPTIMIZATIONS',
			'--angular_pass'		: null,
			'--warning_level'		: 'VERBOSE',
			'--externs'				: glob.sync('closure/externs/*.js')
		},
		java : {
			'-XX:+TieredCompilation' : null
		}
	});

gulp.task('default', function() {

	gulp.src('src/**/*.js')
	.pipe(compiler)
	.pipe(gulp.dest('output/'));
})