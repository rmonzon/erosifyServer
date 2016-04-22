var bcrypt = require('bcrypt-nodejs');
var crypto = require('crypto');
var main = require('./index');
var fs = require('fs');
var helpers = require('./helpers');

var client_token = "";

exports.authentication = function (req, res) {
    var start = new Date();
    var query = "SELECT * FROM profile WHERE email='" + req.body.email + "';";
    main.client.query(query, function (err, result) {
        console.log('Query done in ' + (new Date() - start ) + 'ms');
        if (err) {
            res.status(500).json({ success: false, error: err });
        }
        else {
            if (result.rows[0]) {
                if (bcrypt.compareSync(req.body.password, result.rows[0].password)) {
                    crypto.randomBytes(48, function(err, buffer) {
                        client_token = buffer.toString('hex');
                        res.status(200).json({ success: true, token: client_token, user: result.rows[0], info: "Authentication succeed!" });
                    });
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
};

exports.create_account = function(req, res) {
    var start = new Date();
    var passwordEnc = bcrypt.hashSync(req.body.password);
    var query = "INSERT INTO profile (name, lastname, email, password, dob, gender, age, location, status, pictures, verified) VALUES (" +
        "'" + req.body.name + "', " +
        "'" + req.body.lastname + "', " +
        "'" + req.body.email + "', " +
        "'" + passwordEnc + "', " +
        "'" + req.body.dob + "', " +
        "'" + req.body.gender + "', " +
        "" + req.body.age + ", " +
        "'" + req.body.location + "', " +
        "" + 1 + ", " +
        "" + req.body.pictures + ", " +
        "" + 0 + ");";
    main.client.query(query, function (err, result) {
        console.log('Query done in ' + (new Date() - start ) + 'ms');
        if (err) {
            res.status(200).json({ success: false, error: err});
            //res.json({message: errmsg});
        }
        else {
            start = new Date();
            var query = "SELECT * FROM profile WHERE email='" + req.body.email + "';";
            main.client.query(query, function (err, result) {
                console.log('Query done in ' + (new Date() - start ) + 'ms');
                if (err) {
                    res.status(500).json({ success: false, error: err });
                }
                else {
                    crypto.randomBytes(48, function (err, buffer) {
                        client_token = buffer.toString('hex');
                        res.status(200).json({
                            success: true,
                            token: client_token,
                            user: result.rows[0],
                            info: "Registration succeed!"
                        });
                    });
                }
            });
        }
    });
};

exports.me = function (req, res) {
    if (req.headers.token && req.headers.token === client_token) {
        var start = new Date();
        var query = "SELECT * FROM profile WHERE email='" + req.body.email + "';";
        main.client.query(query, function (err, result) {
            console.log('Query done in ' + (new Date() - start ) + 'ms with no problems');
            if (err) {
                res.status(500).json({ success: false, error: err });
            }
            else {
                res.status(200).json({ success: true, data: result.rows[0] });
            }
        });
    }
    else {
        res.status(401).json({ success: false, error: "Wrong or expired token!" });
    }
};

exports.logout = function (req, res) {
    client_token = "";
    var start = new Date();
    var query = "UPDATE profile SET status=0 WHERE email='" + req.body.email + "';";
    main.client.query(query, function (err, result) {
        console.log('Query done in ' + (new Date() - start ) + 'ms with no problems');
        if (err) {
            res.status(500).json({ success: false, error: err });
        }
        else {
            res.status(200).json({ success: true, info: "Logged out successfully!" });
        }
    });
};

exports.check_email = function (req, res) {
    var start = new Date();
    var query = "SELECT * FROM profile WHERE email='" + req.body.email + "';";
    main.client.query(query, function (err, result) {
        console.log('Query done in ' + (new Date() - start ) + 'ms with no problems');
        if (err) {
            res.status(500).json({ success: false, error: err });
        }
        else {
            res.status(200).json({ success: true, existEmail: result.rows.length > 0 });
        }
    });
};

exports.matches = function (req, res) {
    var start = new Date();
    var query = "SELECT * FROM profile WHERE email<>'" + req.body.email + "';";
    main.client.query(query, function (err, result) {
        console.log('Query done in ' + (new Date() - start ) + 'ms with no problems');
        if (err) {
            res.status(500).json({ success: false, error: err });
        }
        else {
            res.status(200).json({ success: true, matches: result.rows });
        }
    });
};

exports.makeFavorite = function (req, res) {
    var start = new Date();
    var query = "INSERT INTO favorites (profile_id, date) VALUES (" + req.body.profile_id + ", '" + helpers.getDateFormatted(start) + "') RETURNING id;";
    main.client.query(query, function (err, result) {
        console.log('Query done in ' + (new Date() - start ) + 'ms with no problems');
        if (err) {
            res.status(500).json({ success: false, error: err });
        }
        else {
            start = new Date();
            var query = "INSERT INTO profile_fav (profile_id, favorite_id) VALUES (" + req.body.my_id + ", " + result.rows[0].id + ");";
            main.client.query(query, function (err, result) {
                console.log('Query done in ' + (new Date() - start ) + 'ms');
                if (err) {
                    res.status(500).json({ success: false, error: err });
                }
                else {
                    res.status(200).json({
                        success: true,
                        info: "Favorite added successfully!"
                    });
                }
            });
        }
    });
};

exports.getMyFavorites = function (req, res) {
    var start = new Date();
    var query = "SELECT * FROM profile_fav INNER JOIN favorites ON profile_fav.favorite_id = favorites.id INNER JOIN profile ON " +
        "profile.id = favorites.profile_id WHERE profile_fav.profile_id = " + req.body.profile_id + ";";
    main.client.query(query, function (err, result) {
        console.log('Query done in ' + (new Date() - start ) + 'ms with no problems');
        if (err) {
            res.status(500).json({ success: false, error: err });
        }
        else {
            res.status(200).json({ success: true, favorites: result.rows });
        }
    });
};

exports.uploadPictures = function (req, res) {
    fs.readFile(req.file.path, function (err, data) {
        var imageName = req.file.originalname;
        // If there's an error
        if (!imageName) {
            console.log("There was an error");
            res.status(500).json({success: false, error: err});
        } else {
            var newPath = __dirname + "/images/profiles/user_7/" + imageName;
            fs.writeFile(newPath, data, function (err) {
                if (err) {
                    res.status(200).json({success: true, data: "Image uploaded successfully!"});
                }
                else {
                    res.status(200).json({success: true, data: "Image uploaded successfully!"});
                }
            });
        }
    });
};