var q		= require('q'),
	_		= require('lodash'),
	fs 		= require('fs'),
	through	= require('through2'),
	tmp		= require('tmp'),
	gutil	= require('gulp-util'),
	child_p	= require('child_process'),

	plugin 	= function(opts, debug) {

	/**
	 *	debug prevents the tmp dirs from being deleted.
	 */
	debug 	= debug || false,
	opts	= opts	|| {};

	var files 	= [],

		getTmpFiles = function() {

		return q.ninvoke(tmp, 'dir', {dir: '.', unsafeCleanup: !debug})	
		.then(function(tmpdir) {

			tmpdir = tmpdir[0];
			return q.all(_.map(files, function(file) {

				var deferred	= q.defer();

				q.ninvoke(tmp, 'file',
					{
						dir 		: tmpdir,
						template 	: file.relative + '-XXXXXX'
					})
				.then(function(path) {

					path = tmpdir + '/' + path[0],

					q.ninvoke(fs, 'writeFile',
						path,
						file.contents)
					.then(function() {

						deferred.resolve(path);
					});
				})
				.fail(function(e) {

					deferred.reject(e);
				});

				return deferred.promise;
			}));
		})
		.fail(function(e) {

			console.log(e);
		});
	},

		jsFlag 			= function(files) {

		return _.reduce(files, function(flags, file) {

			return [flags, '"', file, '" '].join('');
		}, '--js=');
	},

		serializeFlags	= function(opts) {

		return _.reduce(opts, function(flags, val, key) {

			var a = [flags, ' --', key];

			if (!(_.isUndefined(val) || _.isNull(val)))
				a = a.concat(['=', val]);

			return a.join('');
		}, '');
	},

		collect 		= function(file, encoding, fn) {

		if (file.isNull()) return fn();
		if (file.isStream()) return; // Support single file streaming?

		files.push(file);
		fn();
	},
		compile			= function() {

		if (files.length < 1)
			return;

		getTmpFiles()
		.then(function(files) {

			//console.log(serializeFlags(opts));
			console.log(jsFlag(files));
		});
	};

	return through.obj(collect, compile);
};

module.exports = plugin;