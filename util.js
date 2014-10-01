var _		= require('lodash'),	
	q 		= require('q'),
	tmp 	= require('tmp'),
	path 	= require('path'),
	fs 		= require('fs');

module.exports = function(opts) {

	var util = {};

	util.serializeObj 	= function(obj, fn, m) {

		m = m || '';

		return _.reduce(obj, function(m, v, k) {

			return m += fn(v, k);
		}, m).trim();
	};

	util.formatKV		= function(val, key) {

		var s 	= key;

		if (!(_.isUndefined(val) || _.isNull(val))) {

			if (typeof val === 'string') {

				s = [s, '=', util.formatV(val)].join('');
			} else if (_.isArray(val)) {

				s = [s, '=', util.serializeObj(val, util.formatV)].join('');
			} else if (_.isObject(val)) {

				s = [s, '=', util.serializeObj(val, util.formatKV)].join('');
			}
		}

		return s + ' ';
	};

	util.formatV 		= function(val) {

		return ['"', val, '" '].join('');	
	};

	util.formatFlags		= function(val, key) {

		return '--' + util.formatKV(val, key);
	};



	util.getTmpDir	= function() {

		var deferred = q.defer();

		q.ninvoke(tmp, 'dir', {dir: '.', unsafeCleanup: !opts.debug})
		.then(function(tmpdir) {

			deferred.resolve(tmpdir[0]);
		})
		.fail(function(e) {

			deferred.reject(e);
		});

		return deferred.promise;
	};

	util.mkTmpFiles = function(tmpdir, files) {

		return q.all(_.map(files, function(file) {

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
		.fail(console.log);
	};

	util.mkFlagFile		= function(tmpdir, flags) {

		var deferred 	= q.defer(),
			filePath	= path.resolve(tmpdir + '/' + opts.flagfile);

		q.ninvoke(fs, 'writeFile',
				filePath,
				flags)
		.then(function() {

			deferred.resolve(filePath);
		})
		.fail(deferred.reject);

		return deferred.promise;
	};

	return util;
};