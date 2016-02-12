Express CORS OPTIONS
====================

Create a catch all for responding to CORS OPTIONS method requests

----

Installation

````bash
npm install express-cors-options
````


Usage:

````javascript
// Place after router
app.use(app.router);

//
var options = {
	origin: 'http://foo.com', // default: '*'
	method: 'GET,PUT,POST', // default: 'GET,PUT,POST,DELETE,HEAD,OPTIONS'
	headers: 'Content-Type, Content-Length' // default: 'Content-Type, Authorization, Content-Length, X-Requested-With, X-HTTP-Method-Override'
};

app.use(require('express-cors-options')(options));
````