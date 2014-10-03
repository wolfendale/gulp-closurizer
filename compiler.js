var child_p 	= require('child_process'),
	q			= require('q'),
	_			= require('lodash'),
	gutil 		= require('gulp-util'),
	tmp 		= require('tmp'),
	fs 			= require('fs-extra'),
	Serializer	= require('./serializer'),
	path		= require('path');

module.exports 	= function(opts) {

	var serializer 	= new Serializer();

	/**
	 *	@constructor
	 *	
	 *	This sets up the compiler state with serialized flags for both the compiler
	 *	and for the java instance.
	 */
	var Compiler 	= function(fPath, c_opts, j_opts) {

		this.path 		= fPath;
		this.c_opts		= serializer.serialize(c_opts);
		this.args 		= ['-jar', serializer.serialize(j_opts), this.path];
	};

	/*
	 *	Setup method which creates temporary files and directories for the compilation
	 *	Returns a promise that contains the path to the flagfile with all of the compiler
	 * 	options contained.
	 */
	Compiler.prototype._setup 	= function(files) {

		var self = this, mkTmpDir, mkTmpFiles, mkFlagFile, deferred;

		/*
		 *	This function uses the tmp library to create a temporary directory
		 *	in the project folder which will be cleaned up after the plugin exits.
		 *	It then returns a promise which contains the path to the temp folder.
		 */
		mkTmpDir 	= function() {

			var deferred 	= q.defer();

			q.ninvoke(tmp, 'dir', {dir: '.', unsafeCleanup: !opts.debug})
			.then(function(tmpdir) {

				deferred.resolve(tmpdir[0]);
			})
			.fail(deferred.reject);

			return deferred.promise;
		};

		/*
		 *	This function takes the list of files that have been passed by gulp
		 *	and writes them into the temporary folder, we do this instead of
		 *	just reading the original files in case there have been other changes
		 *	made to them in the gulp pipeline.
		 *
		 *	We then return a promise which contains an array holding the tmp dir path
		 *	and the paths of all of the temporary js files within.
		 */
		mkTmpFiles 	= function(tmpdir) {

			var deferred	= q.defer();

			q.all(_.map(files, function(file) {

				var deferred	= q.defer(),
					filePath	= path.resolve(tmpdir + '/' + file.relative);

				q.ninvoke(fs, 'outputFile',
					filePath,
					file.contents)
				.then(function() {

					deferred.resolve(filePath);
				})
				.fail(deferred.reject);

				return deferred.promise;
			}))
			.then(function(paths) {

				deferred.resolve([tmpdir, paths]);
			})
			.fail(deferred.reject);

			return deferred.promise;
		};

		/*	
		 *	This function creates a temporary file to hold all of the flags passed to the
		 *	compiler, this is so that we don't hit the max args of the environment we're
		 * 	running under.
		 *
		 * 	It returns a promise which contains the path to the flagfile to be used when
		 *	calling the compiler.jar
		 */
		mkFlagFile 	= function(tmpdir, files) {

			var deferred 	= q.defer(),
				filePath	= path.resolve(tmpdir + '/' + opts.flagfile),

				flags 		= [self.c_opts, serializer.serialize({ '--js' : files })].join(' ');

			q.ninvoke(fs, 'writeFile',
					filePath,
					flags)
			.then(function() {

				deferred.resolve(filePath);
			})
			.fail(deferred.reject);

			return deferred.promise;
		};

		/*
		 *	This is the main body of the method, it sequentially executes the
		 *	different setup functions and returns a promise which contains the
		 *	path to the flagfile.
		 */
		return mkTmpDir().then(mkTmpFiles).spread(mkFlagFile);
	};

	/*
	 *	This is the main compilation method, it is responsible for creating the
	 *	temporary files required by the compiler and then spawning the java
	 *	process which will run the actual compilation. Currently we return data
	 *	from the stdout, however we may need to utilise another temporary file
	 * 	instead.
	 */
	Compiler.prototype.compile = function(files) {

		var self		= this;

		return self._setup(files)
		.then(function(flagfile) {

			var deferred = q.defer();

			self.args.push('--flagfile="' + flagfile + '"');

			q.ninvoke(child_p, 'execFile', 'java', self.args)
			.then(function(stdout, stderr) {

				if (stderr)
					console.log(stderr);

				// TODO: Some magic with the stdout stuff.
				console.log(stdout[1]);
				deferred.resolve(new Buffer(stdout[0]));
			})
			.fail(deferred.reject);

			return deferred.promise;
		})
		.fail(gutil.log);
	};

	return Compiler;
};