var _			= require('lodash'),
	path		= require('path'),
	through 	= require('through2'),
	fs 			= require('fs-extra'),
	gutil		= require('gulp-util'),
	child_p		= require('child_process'),
	serializer 	= require('./serializer');

const PLUGIN_NAME	= 'gulp-closure';

var plugin 			= function(opts) {

	/*
	 *	Set up default options for the plugin.
	 */
	opts 			= opts || {};

	opts.plugin 	= _.defaults(opts.plugin || {}, {

		debug 		: false,
		mapComment	: true,
		compiler 	: path.resolve('closure/compiler.jar'),
		tmpdir 		: 'tmp',
		flagfile 	: 'flagfile.tmp',
		output 		: 'output.min.js',
		maxBuffer 	: 20 * 1024 * 1024
	});

	opts.compiler 	= opts.compiler || {};
	opts.java 		= opts.java 	|| {};

	/*
	 *	Error catching code for unsupported compiler options.
	 *
	 *	Wrapped in a closure so we don't pollute the plugin namespace.
	 */
	(function() {

		var unsupported = {
			'--module' 				: 'This plugin does not currently support module creation.',
			'--flag_file'			: 'This plugin uses --flag_file internally, just pass options in the configuration object.',
			'--js_output_file' 		: 'This plugin outputs to stdout so that it can be piped on to other gulp tasks. Utilise `gulp.dest` in your task instead.',
			'--help'	 			: '',
			'--print_ast'			: '',
			'--print_pass_graph'	: '',
			'--print_tree'			: '',
			'--translations_file'	: ''
		},

			invalidOpts = _.intersection(Object.keys(opts.compiler), Object.keys(unsupported));

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
		Compiler 	= require('./compiler'),

	/*
	 *	This function collects all files that are buffers and adds them to the files array
	 *	to be processed in the `flush` function. This is because we need access to all
	 *	of the files before we begin compilation.
	 */
	collect 		= function(file, encoding, fn) {

		if (file.isNull()) { 
			return fn(null, file);
		}

		if (file.isStream()) {
			return fn(new gutil.Error(PLUGIN_NAME, 'Streams are not supported'));
		}

		files.push(file);

		if (!_.isUndefined(opts.compiler['--create_source_map']) &&
				opts.compiler['--create_source_map'] !== null) {

			this.push(file);
		}

		return fn();
	},

	/*
	 *	This flush function is called before the stream is ended but after we have
	 * 	all of the content. 
	 */
	flush			= function(fn) {

		var self 		= this,
			compiler 	= new Compiler(opts);

		compiler.compile(files)
		.then(function(contents) {

			var outfile, mapfile, mappath;

			/*
			 *	Create the new output vinyl file
			 */
			outfile 			= files[0].clone();
			outfile.path 		= path.join(outfile.base, opts.plugin.output);
			outfile.contents 	= contents;

			mappath 			= path.join(opts.plugin.tmpdir, opts.compiler['--create_source_map']);
			if (!_.isUndefined(opts.compiler['--create_source_map']) &&
				opts.compiler['--create_source_map'] !== null) {

				// Create the sourcemap file
				mapfile 			= files[0].clone();
				mapfile.path		= path.join(mapfile.base, opts.compiler['--create_source_map']);
				mapfile.contents 	= fs.readFileSync(mappath);

				self.push(mapfile);

				// Add source map comment to output file.
				if (opts.plugin.mapComment === true) {

					outfile.contents = Buffer.concat([outfile.contents,
						new Buffer('//# sourceMappingURL=' + opts.compiler['--create_source_map'], 'utf-8')]);
				}
			}

			// remove temp folder
			if (fs.existsSync(opts.plugin.tmpdir)) {
				fs.remove(opts.plugin.tmpdir);
			}

			self.push(outfile);
			fn();
		})
		.fail(gutil.log);
	};

	/*
	 *	We return a through2 transform stream of these two functions.
	 */
	return through.obj(collect, flush);
};

module.exports = plugin;