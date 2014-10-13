var _			= require('lodash'),
 	q 			= require('q'),
	path		= require('path'),
	through 	= require('through2'),
	fs 			= require('fs-extra'),
	gutil		= require('gulp-util'),
	child_p		= require('child_process'),
	Serializer 	= require('./serializer');

const PLUGIN_NAME	= 'gulp-closurizer';

var plugin 			= function(opts) {

	/*
	 *	Set up default options for the plugin.
	 */
	opts 			= opts || {};

	opts.plugin 	= _.defaults(opts.plugin || {}, {

		debug 		: false,
		mapComment	: true,
		sourcePass	: false,
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
			'--js_output_file' 		: 'This plugin outputs to stdout so that it can be piped on to other gulp tasks. Use `gulp.dest` in your task instead.',
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
	 *	local variables and aliases
	 */
	var files 		= [],
		tmpdir		= opts.plugin.tmpdir,
		flagfile 	= opts.plugin.flagfile,
		outpath 	= opts.plugin.output,
		externs 	= opts.compiler['--externs'] || null,
		sourceMap 	= opts.compiler['--create_source_map'] || null,
		sourcePass 	= opts.plugin.sourcePass,
		serializer 	= new Serializer();
	
	/*
	 *	The main compilation function
	 */
	compile 		= function() {

		var self		= this,
			paths 		= [],
			deferred 	= q.defer(),
			args 		= ['-jar', serializer.serialize(opts.java), opts.plugin.compiler];

		// create temp dir
		if (!fs.existsSync(tmpdir)) {
			fs.mkdirSync(tmpdir);
		} else {
			throw new gutil.PluginError(PLUGIN_NAME, 'temporary directory `' + tmpdir +
														'` cannot be created. Please choose another directory.');
		}

		// create temp files
		for (var i = 0, len = files.length, file; i < len; ++i) {

			file = files[i];
			fs.outputFileSync(path.join(tmpdir, file.relative), file.contents);
			paths.push(file.relative);
		}

		/*
		 *	IS THIS TOO HACKY?
		 *	We loop through the given externs files and resolve their paths to the
		 *	temp dir that is given, as this will be used as the working directory of 
		 *	the compiler.
		 */

		if (!_.isUndefined(externs)) {

			// Can't use the alias here.
			opts.compiler['--externs'] = _.map(externs,
				function(file) {

					return path.relative(path.resolve(tmpdir),
											path.resolve(file));
				});
		}

		// create flag file
		fs.outputFileSync(path.join(tmpdir, flagfile), [
			serializer.serialize(opts.compiler),
			serializer.serialize({'--js_output_file' : outpath}),
			serializer.serialize({'--js' : paths})
			].join(' '));

		args.push('--flagfile="' + flagfile + '"');

		// execute the compiler
		child_p.execFile('java', args,
			{maxBuffer: opts.plugin.maxBuffer, cwd: tmpdir},
			function(err, stdout, stderr) {

				if (err || stderr) return deferred.reject(err || stderr);

				if (stderr) {

					gutil.log(stderr);
					deferred.reject(stderr);
				}

				deferred.resolve(fs.readFileSync(tmpdir + '/' + outpath));
			});

		return deferred.promise;
	};

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

		if (sourceMap !== null && sourcePass === true) {

			this.push(file);
		}

		return fn();
	},

	/*
	 *	This flush function is called before the stream is ended but after we have
	 * 	all of the content. 
	 */
	flush			= function(fn) {

		var self 		= this;

		compile(files)
		.then(function(contents) {

			var outfile, mapfile;

			/*
			 *	Create the new output vinyl file
			 */
			outfile 			= files[0].clone();
			outfile.path 		= path.join(outfile.base, outpath);
			outfile.contents 	= contents;

			if (sourceMap !== null) {

				// Create the sourcemap file
				mapfile 			= files[0].clone();
				mapfile.path		= path.join(mapfile.base, sourceMap);
				mapfile.contents 	= fs.readFileSync(path.join(tmpdir, sourceMap));

				self.push(mapfile);

				// Add source map comment to output file.
				if (opts.plugin.mapComment === true) {

					outfile.contents = Buffer.concat([outfile.contents,
						new Buffer('//# sourceMappingURL=' + sourceMap, 'utf-8')]);
				}
			}

			self.push(outfile);
			fn();
		})
		.fail(function(e) {

			gutil.log(e.toString());
		})
		.fin(function() {

			if (fs.existsSync(tmpdir)) {
				gutil.log('Removing tmpdir...');
				fs.remove(tmpdir);
			}
		});
	};

	/*
	 *	We return a through2 transform stream of these two functions.
	 */
	return through.obj(collect, flush);
};

module.exports = plugin;