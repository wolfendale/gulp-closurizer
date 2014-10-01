var child_p 	= require('child_process'),
	q			= require('q'),
	_			= require('lodash'),
	fs 			= require('fs'),
	path		= require('path');

module.exports 	= function(opts) {

	var util 	= require('./util')(opts);

	var Compiler 	= function(fPath, c_opts, j_opts) {

		this.path 		= fPath;
		
		var c_opts		= util.serializeObj(c_opts, util.formatFlags),
			j_opts 		= util.serializeObj(j_opts, util.formatKV),
			args		= ['-jar', this.path];

		if (!_.isEmpty(j_opts)) {

			args 		= [_.head(args), j_opts].concat(_.rest(args));
		}

		this.args 		= args;
		this.c_opts		= c_opts;
	};

	Compiler.prototype.compile = function(files) {

		var deferred 	= q.defer(),
			self		= this;

		util.getTmpDir()
		.then(function(tmpdir) {

			return util.mkTmpFiles(tmpdir, files)
			.then(function(files) {

				return util.mkFlagFile(tmpdir, self.c_opts + ' ' +
						util.serializeObj(files, util.formatV));
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