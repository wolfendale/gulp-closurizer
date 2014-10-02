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