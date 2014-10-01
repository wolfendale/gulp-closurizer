var q			= require('q'),
	_			= require('lodash'),
	fs 			= require('fs'),
	path		= require('path'),
	through 	= require('through2'),
	tmp			= require('tmp'),
	gutil		= require('gulp-util'),
	child_p		= require('child_process'),

	plugin 		= function(opts, c_opts, j_opts) {

	opts 			= opts 				|| {};
	opts.debug		= opts.debug 		|| false;
	opts.compiler	= opts.compiler 	|| path.resolve('closure/compiler.jar');
	opts.flagfile 	= opts.flagfile 	|| 'flagfile.tmp'
	opts.output		= opts.output		|| 'output.min.js'

	c_opts 			= c_opts || {};

	// Unsupported compiler options.
	delete c_opts.flag_file;
	delete c_opts.js_output_file;

	j_opts			= j_opts || {};

	var files 		= [],
		Compiler 	= require('./compiler')(opts),

	collect 		= function(file, encoding, fn) {

		if (file.isNull() || file.isStream()) return fn();

		files.push(file);
		return fn();
	},

	flush			= function(fn) {

		var file 		= files[0].clone(),
			compiler 	= new Compiler(opts.compiler, c_opts, j_opts),
			self		= this;

		file.path 		= file.base + opts.output;

		compiler.compile(files)
		.then(function(contents) {

			file.contents = contents;
			self.push(file);
			fn();
		});
	};

	return through.obj(collect, flush);
};

module.exports = plugin;