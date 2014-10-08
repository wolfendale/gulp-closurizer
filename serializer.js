var _	 	= require('lodash'),
	glob 	= require('glob'),
	gutil	= require('gulp-util');

/*
 *	Class for dealing serializing objects into command line arguments.
 *	Other implementations prefix flags automatically and other magic,
 * 	however I don't see much point, this will pass compiler/java flags
 *	straight through so make sure they're defined in an object with
 * 	the keys delimited by ''
 */
var Serializer = function(opts) {

	opts 		= opts || {};

	this.opts 	= _.defaults(opts, {

		kvDelim		: '=',
		flagDelim 	: ' ',
		valDelim	: ',',
		kPre		: '',
		kPost		: '',
		vPre		: '"',
		vPost		: '"',
		repeatKey	: true
	});
};

/*
 *	Formats a flag 'key' with an optional prefix/suffix
 */
Serializer.prototype.formatKey 		= function(key) {

	return [this.opts.kPre,
			key,
			this.opts.kPost].join('');
};

/*
 *	Formats a flag value with an optional prefix/suffix
 */
Serializer.prototype.formatValue	= function(val) {

	return [this.opts.vPre,
			val,
			this.opts.vPost].join('');
};

/*
 *	This is the main serialization method, it reduces an object
 * 	to a string of flags, if `repeatKey` is true, array values
 *	will have the key repeated for each occurance of the value.
 *
 *	e.g. flag="val1" flag="val2" 
 *
 *	Default flag format is key="val", if you wanted to enforce
 *	`--` at the start of a flag, you could set the `kPre` property
 *	to `--`.
 */
Serializer.prototype.serializeObject 	= function(args) {

	var self = this, s;

	s = _.reduce(args, function(m, v, k) {

		if (_.isUndefined(v) || _.isNull(v)) {

			return m + [self.formatKey(k),
						self.opts.flagDelim].join('');
		} else if (_.isArray(v)) {

			if (self.opts.repeatKey === true) {

				return m + _.reduce(v, function(m, v) {

					return [m,
							self.formatKey(k),
							self.opts.kvDelim,
							self.formatValue(v),
							self.opts.flagDelim].join('');
				}, '');
			} else {

				v 	= v.join(self.opts.valDelim);
			}
		}

		return m + [self.formatKey(k),
					self.opts.kvDelim,
					self.formatValue(v),
					self.opts.flagDelim].join('');

		return m + f;
	}, '');

	return s.substr(0, s.length - self.opts.flagDelim.length);
}

/**
 *	Entry point for serialization, does some type checking
 *	and then defers to the relevant function.
 */
Serializer.prototype.serialize 			= function(arg) {

	if (_.isUndefined(arg))
		throw new Error('`arg` must be defined');

	if (_.isString(arg)) {

		return this.formatKey(arg);
	}

	if (_.isObject(arg)) {

		return this.serializeObject(arg);
	}
};

module.exports = Serializer;