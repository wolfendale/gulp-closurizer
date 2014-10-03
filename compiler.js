var child_p 	= require('child_process'),
	q			= require('q'),
	_			= require('lodash'),
	fs 			= require('fs'),
	Serializer	= require('./serializer'),
	path		= require('path');

module.exports 	= function(opts) {

	// TODO: Phase out the utils module as most functionality is inside serializer.
	var util 		= require('./util')(opts),
		serializer 	= new Serializer();

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

	Compiler.prototype._setup 	= function(files) {

		var mkTmpDir, mkTmpFiles, mkFlagFile, deferred;

		deferred = q.defer();

		mkTmpDir()
		.then(mkTmpFiles(files))
		.then(mkFlagFile)
		.then(function(flagfile) {

			deferred.resolve(flagfile);
		})
		.fail(function(e) {

			deferred.reject(e);
		});

		return deferred.promise;

		mkTmpDir 	= function() {

			var deferred = q.defer();

			q.ninvoke(tmp, 'dir', {dir: '.', unsafeCleanup: !opts.debug})
			.then(function(tmpdir) {

				deferred.resolve(tmpdir[0]);
			})
			.fail(function(e) {

				deferred.reject(e);
			});

			return deferred;
		};

		mkTmpFiles 	= function(files) {

			/*
			 *	Some manual currying here.
			 */
			return function(tmpdir) {

				var deferred	= q.defer();

				q.all(_.map(files, function(file) {

					var deferred	= q.defer(),
						filePath	= path.resolve(tmpdir + '/' + file.relative);

					q.ninvoke(fs, 'writeFile',
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
				.fail(function(deferred.reject);

				return deferred.promise;
			};
		};

		mkFlagFile 	= function(args) {

			var deferred 	= q.defer();

			return deferred.promise;
		}
	};

	/*
	 *	This is the main compilation method, it is responsible for creating the
	 *	temporary files required by the compiler and then spawning the java
	 *	process which will run the actual compilation. Currently we return data
	 *	from the stdout, however we may need to utilise another temporary file
	 * 	instead.
	 */
	Compiler.prototype.compile = function(files) {

		var deferred 	= q.defer(),
			self		= this;

		util.getTmpDir()
		.then(function(tmpdir) {

			return util.mkTmpFiles(tmpdir, files)
			.then(function(files) {

				return util.mkFlagFile(tmpdir, self.c_opts + ' ' +
						serializer.serialize({ '--js' : files }));
			});
		})
		.then(function(flagfile) {

			self.args.push('--flagfile="' + flagfile + '"');

			q.ninvoke(child_p, 'execFile', 'java', self.args)
			.then(function(stdout, stderr) {

				// TODO: Some magic with the stdout stuff.
				console.log(stdout[1]);
				deferred.resolve(new Buffer(stdout[0]));
			})
			.fail(function(e) {

				console.log(e);
				deferred.reject(e);
			});
		})
		.fail(console.log);

		return deferred.promise;
	};

	return Compiler;
};