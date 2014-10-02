var _			= require('lodash'),
	path		= require('path'),
	through 	= require('through2'),
	tmp			= require('tmp'),
	gutil		= require('gulp-util'),
	child_p		= require('child_process'),
	serializer 	= require('./serializer');

const PLUGIN_NAME	= 'gulp-closure';

var plugin 		= function(opts, c_opts, j_opts) {

	/*
	 *	Set up default options for the plugin.
	 */
	opts 		= opts || {};
	opts 		= _.defaults(opts, {

		debug		: false,
		compiler 	: path.resolve('closure/compiler.jar'),
		flagfile 	: 'flagfile.tmp',
		output 		: 'output.min.js'
	});

	/*
	 *	Set up default options for the compiler.
	 */
	c_opts 			= c_opts || {};
	c_opts 			= _.defaults(c_opts, {});

	/*
	 *	Set up default options to be passed to the `java` instance.
	 */
	j_opts 			= j_opts || {};
	j_opts			= _.defaults(j_opts, {});

	/*
	 *	Error catching code for unsupported compiler options.
	 *	TODO: Add messages for each unsupported flag.
	 *
	 *	Wrapped in a closure so we don't pollute the plugin namespace.
	 */
	(function() {

		var unsupported = {
			'--module' 				: '',
			'--flag_file'			: '',
			'--js_output_file' 		: '',
		},

			invalidOpts = _.intersection(Object.keys(c_opts), Object.keys(unsupported));

		if (invalidOpts.length > 0) {

			var message = 'You have selected unsupported compiler options: \n';

			invalidOpts.forEach(function(e) {

				message += '\'' + e + '\' - ' + unsupported[e] + '\n';
			});

			throw new gutil.PluginError(PLUGIN_NAME, message);
		}
	})();

	/*
	 *	files 	: An array of vinyl files that will be filled by the `collect` function.
	 *	
	 *	NOTE: We require the Compiler module here as we will have parsed the opts now.
	 */
	var files 		= [],
		Compiler 	= require('./compiler')(opts),

	/*
	 *	This function collects all files that are buffers and adds them to the files array
	 *	to be processed in the `flush` function. This is because we need access to all
	 *	of the files before we begin compilation.
	 */
	collect 		= function(file, encoding, fn) {

		if (file.isNull() || file.isStream()) return fn(); // Should we log a warning?

		files.push(file);
		return fn();
	},

	/*
	 *	This flush function is called before the stream is ended but after we have
	 * 	all of the content. 
	 */
	flush			= function(fn) {

		var self 		= this,
			compiler 	= new Compiler(opts.compiler, c_opts, j_opts);

		compiler.compile(files)
		.then(function(contents) {

			var file 		= files[0].clone();

			file.path 		= file.base + opts.output;
			file.contents 	= contents;

			self.push(file);
			fn();
		});
	};

	/*
	 *	We return a through2 transform stream of these two functions.
	 */
	return through.obj(collect, flush);
};

module.exports = plugin;