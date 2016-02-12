var path = require('path');
var fs = require('fs');
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var cors = require('express-cors-options');
var pg = require('pg');
var _ = require('underscore');
var bcrypt = require('bcrypt-nodejs');

// read the config
var config = {};

console.log(path.basename(__filename, path.extname(__filename)));
var configfile = './' + path.basename(__filename, path.extname(__filename)) + '.json';
try {
    console.log("Getting configuration from " + configfile);
    var data = fs.readFileSync(configfile, 'utf8');
    console.log('Config:\r\n' + data);
    var newConfig = JSON.parse(data);
    for (var key in newConfig) {
        if (newConfig.hasOwnProperty(key)) {
            config[key] = newConfig[key];
        }
    }
}
catch(err) {
    console.log(err);
    console.log('Usage: node ' + path.basename(__filename, path.extname(__filename)));
}

// connect to the database and use a pool
console.log("Connecting to database: " + config.dbURL.database);
console.log("DB hosted on Heroku at: " + config.dbURL.host);
pg.connect(config.dbURL, function(err, client, done) {
    if (err) {
        return console.error('Error fetching client from pool', err);
    }

    // add some middlewares
    // simple logger
    app.use(function (req, res, next) {
        console.log('%s %s', req.method, req.url);
        next();
    });
    app.use(cors());
    app.use(bodyParser());

    // create a router
    var router = express.Router();

    // middleware to use for all requests
    router.use(function (req, res, next) {
        // do logging
        console.log('Request received by router.');
        res.setHeader('Access-Control-Allow-Origin', '*');

        next(); // make sure we go to the next routes and don't stop here
    });

    router.post('/sql', function (req, res) {
        console.log('req.body:');
        console.log(req.body);
        var queryString = req.body.query;
        var start = new Date();
        client.query(queryString, function (err, result) {
            console.log('Query done in ' + (new Date() - start ) + 'ms');
            if (err) {
                var errmsg = 'error running query:' + err;
                console.log(errmsg);
                res.json({message: errmsg});
            }
            else {
                console.log('Query done Rows:' + result.rows.length);
                var answer = result.rows;
                // console.log(answer);
                res.json(answer);
            }
        });
    });

    router.post('/create_account', function(req, res) {
        console.log(req.body);
        var start = new Date();
        var passwordEnc = bcrypt.hashSync(req.body.password);
        var query = "INSERT INTO profile (name, lastname, email, password, dob, gender) VALUES ('" + req.body.name + "', '" + req.body.lastname + "', '" + req.body.email + "', '" + passwordEnc + "', '" + req.body.dob + "', '" + req.body.gender + "');";
        client.query(query, function (err, result) {
            console.log('Query done in ' + (new Date() - start ) + 'ms');
            if (err) {
                res.status(500).json({ success: false, error: err});
                //res.json({message: errmsg});
            }
            else {
                res.status(200).json(result);
            }
        });
    });

    router.post('/authentication', function(req, res) {
        var start = new Date();
        var query = "SELECT password FROM profile WHERE email='" + req.body.email + "';";
        client.query(query, function (err, result) {
            console.log('Query done in ' + (new Date() - start ) + 'ms');
            if (err) {
                res.status(500).json({ success: false, error: err });
            }
            else {
                if (result.rows[0]) {
                    if (bcrypt.compareSync(req.body.password, result.rows[0].password)) {
                        console.log("passwords matched!!!");
                        res.status(200).json({ success: true, info: "Authentication succeed!" });
                    }
                    else {
                        console.log(result.rows[0].password);
                        res.status(200).json({ success: false, info: "Password is incorrect!" });
                    }
                }
                else {
                    res.status(200).json({ success: false, info: "Email does not exist!" });
                }
            }
        });
    });

    // register our router
    app.use('/api/v1/', router);

    // start the server
    app.listen(process.env.PORT || config.HTTPServerPort);
    console.log('RESTful server started on port ' + config.HTTPServerPort);
});