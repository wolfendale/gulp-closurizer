var child_p 	= require('child_process'),
	q			= require('q'),
	_			= require('lodash'),
	fs 			= require('fs'),
	path		= require('path');

module.exports 	= function(opts) {

	var util 	= require('./util')(opts);

	var Compiler 	= function(fPath, c_opts, j_opts) {
		
		this.c_opts		= util.serializeObj(c_opts, util.formatFlags);
		this.j_opts 	= util.serializeObj(j_opts, util.formatKV);
		this.path 		= fPath;
	};

	Compiler.prototype.compile = function(files) {

		var deferred 	= q.defer(),
			args		= ['-jar', this.path],
			self		= this;

		if (!_.isEmpty(this.j_opts)) {

			args = [_.head(args), this.j_opts].concat(_.rest(args));
		}

		util.getTmpDir()
		.then(function(tmpdir) {

			return util.mkTmpFiles(tmpdir, files)
			.then(function(files) {

				return util.mkFlagFile(tmpdir, self.c_opts + ' ' +
						util.serializeObj(files, util.formatV));
			});
		})
		.then(function(flagfile) {

			args.push('--flagfile="' + flagfile + '"');

			q.ninvoke(child_p, 'execFile', 'java', args)
			.then(function(stdout, stderr) {

				console.log(stdout[1]);
				deferred.resolve(new Buffer(stdout[0]));
			})
			.fail(function(e) {

				console.log(e);
				deferred.reject(e);
			});
		})
		.fail(function(e){ 

			console.log(e);
		});
		return deferred.promise;
	};

	return Compiler;
};