var gulp		= require('gulp'),
	compiler 	= require('./index.js')({},
	{
		'--compilation_level'	: 'ADVANCED_OPTIMIZATIONS',
		'--angular_pass'		: null,
		'--warning_level'		: 'VERBOSE',
		'--externs'				: [
			'closure/externs/angular.js'
		]
	},
	{
		'-XX:+TieredCompilation' : null
	});

gulp.task('default', function() {

	gulp.src('src/*.*')
	.pipe(compiler)
	.pipe(gulp.dest('output/'));
})