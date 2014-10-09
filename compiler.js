var child_p 	= require('child_process'),
	q			= require('q'),
	_			= require('lodash'),
	gutil 		= require('gulp-util'),
	fs 			= require('fs-extra'),
	Serializer	= require('./serializer'),
	path		= require('path'),

	serializer 	= new Serializer();

/*	
 *	This sets up the compiler state with serialized flags for both the compiler
 *	and for the java instance.
 */
var Compiler 	= function(opts) {

	this.opts 		= opts;
	//TODO: remove this.args
	this.args 		= ['-jar', serializer.serialize(opts.java), opts.plugin.compiler];
};

/*
 *	This is the main compilation method, it is responsible for creating the
 *	temporary files required by the compiler and then spawning the java
 *	process which will run the actual compilation. Currently we return data
 *	from the stdout, however we may need to utilise another temporary file
 * 	instead.
 */
Compiler.prototype.compile = function(files) {

	var self		= this,
		opts 		= self.opts.plugin,
		paths 		= [],
		deferred 	= q.defer();

	// create temp dir
	if (!fs.existsSync(self.opts.plugin.tmpdir)) {
		fs.mkdirSync(self.opts.plugin.tmpdir);
	}

	// create temp files
	for (var i = 0, len = files.length, file; i < len; ++i) {

		file = files[i];
		fs.outputFileSync(path.join(self.opts.plugin.tmpdir, file.relative), file.contents);
		paths.push(file.relative);
	}

	// is this too hacky?
	if (!_.isUndefined(self.opts.compiler['--externs'])) {

		self.opts.compiler['--externs'] = _.map(self.opts.compiler['--externs'],
			function(file) {

				return path.relative(path.resolve(self.opts.plugin.tmpdir),
										path.resolve(file));
			});
	}

	var outfile = path.relative(path.resolve(self.opts.plugin.tmpdir),
									path.resolve(self.opts.plugin.output));

	// create flag file
	fs.outputFileSync(path.join(self.opts.plugin.tmpdir, self.opts.plugin.flagfile), [
		serializer.serialize(self.opts.compiler),
		serializer.serialize({'--js_output_file' : self.opts.plugin.output}),
		serializer.serialize({'--js' : paths})
		].join(' '));

	self.args.push('--flagfile="' + self.opts.plugin.flagfile + '"');

	// execute the compiler
	child_p.execFile('java', self.args,
		{maxBuffer: self.maxBuffer, cwd: self.opts.plugin.tmpdir},
		function(err, stdout, stderr) {

			if (err || stderr) return deferred.reject(err || stderr);

			if (stderr) {

				gutil.log(stderr);
				deferred.reject(stderr);
			}

			deferred.resolve(fs.readFileSync(self.opts.plugin.tmpdir + '/' + self.opts.plugin.output));
		});

	return deferred.promise;
};

module.exports = Compiler;