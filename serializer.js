var _ 	= require('lodash');

var Serializer = function(opts) {

	opts 		= opts || {};

	this.opts 	= _.defaults(opts, {

		kvDelim		: '=',
		flagDelim 	: ' ',
		valDelim	: ',',
		kPre		: '',
		kPost		: '',
		vPre		: '',
		vPost		: '',
		repeatKey	: true
	});
};

Serializer.prototype.formatKey 		= function(key) {

	return [this.opts.kPre,
			key,
			this.opts.kPost].join('');
};

Serializer.prototype.formatValue	= function(val) {

	return [this.opts.vPre,
			val,
			this.opts.vPost].join('');
};

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

Serializer.prototype.serialize 			= function(arg) {

	if (_.isUndefined(arg))
		throw 'args must be defined';

	if (_.isString(arg)) {

		return this.formatKey(arg);
	}

	if (_.isObject(arg)) {

		return this.serializeObject(arg);
	}
};

module.exports = Serializer;