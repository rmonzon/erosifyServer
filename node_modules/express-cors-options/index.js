var configExtend = require('config-extend');

module.exports = function(options) {
	options = configExtend({
		origin: '*',
		methods: 'GET,PUT,POST,DELETE,HEAD,OPTIONS',
		headers: 'Content-Type, Authorization, Content-Length, X-Requested-With, X-HTTP-Method-Override'
	}, options);

	return function(req, res, next) {
		if (req.method === 'OPTIONS') {
			res.setHeader('Access-Control-Allow-Origin', options.origin);
			res.setHeader('Access-Control-Allow-Methods', options.methods);
			res.setHeader('Access-Control-Allow-Headers', options.headers);
			res.send();
		}
		else {
			next();
		}
	};
};
