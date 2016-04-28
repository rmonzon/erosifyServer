var path = require('path');
var fs = require('fs');
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var cors = require('cors');
var pg = require('pg');
var _ = require('underscore');
var http = require('http');
var routes = require('./routes');
var multer  = require('multer');
var upload = multer({ dest: 'images/profiles/' });

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

app.use(express.static('images'));

// connect to the database and use a pool
console.log("Connecting to database: " + config.dbURL.database);
console.log("DB hosted on Heroku at: " + config.dbURL.host);
pg.connect(config.dbURL, function(err, client, done) {
    if (err) {
        return console.error('Error fetching client from pool', err);
    }

    exports.client = client;

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
        res.header("Access-Control-Allow-Origin", "*");

        next(); // make sure we go to the next routes and don't stop here
    });

    router.post('/create_account', routes.create_account);

    router.post('/authentication', routes.authentication);

    router.post('/me', routes.me);

    router.post('/logout', routes.logout);

    router.post('/check_email', routes.check_email);

    router.post('/matches', routes.matches);

    router.post('/add_favorite', routes.addFavorite);

    router.post('/remove_favorite', routes.removeFavorite);

    router.post('/favorites', routes.getMyFavorites);

    router.post('/like', routes.doLikeOrDislike);

    router.post('/wholikedme', routes.getMyLikes);

    router.post('/mymatches', routes.getMyMatches);

    router.get('/user/:id', routes.getUserInfo);
    
    router.post('/visited_profile', routes.addVisitedProfile);
    
    router.post('/myvisitors', routes.getMyVisitors);
    
    
    
    


    router.post('/upload', upload.single('avatar'), routes.uploadPictures);

    router.post('/photos/user/upload/:uid', upload.array('photos', 12), routes.uploadPictures);

    // register our router
    app.use('/api/v1/', router);

    // start the server
    app.listen(process.env.PORT || config.HTTPServerPort);
    console.log('RESTful API server started on port ' + config.HTTPServerPort);
});