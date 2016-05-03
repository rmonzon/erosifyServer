var bcrypt = require('bcrypt-nodejs');
var crypto = require('crypto');
var main = require('./index');
var fs = require('fs');
var helpers = require('./helpers');

var client_token = "";

exports.authentication = function (req, res) {
    var start = new Date();
    var update = "UPDATE profile SET location = '" + req.body.location + "', coordinates = '" + JSON.stringify(req.body.coords) + "' WHERE email = '" + req.body.email + "';";
    var query = update + "SELECT * FROM profile WHERE email='" + req.body.email + "';";
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
        var query = "UPDATE profile SET status = 1 WHERE email='" + req.body.email + "';SELECT * FROM profile WHERE email='" + req.body.email + "';";
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
    var query = "SELECT " +
        "profile.id, " +
        "profile.name, " +
        "profile.email, " +
        "profile.age, " +
        "profile.gender, " +
        "profile.aboutme, " +
        "profile.work, " +
        "profile.education, " +
        "profile.location, " +
        "profile.status, " +
        "profile.pictures, " +
        "profile.verified, " +
        "profile.languages " +
        "FROM profile WHERE profile.id NOT IN (SELECT user_two_id FROM relationships WHERE user_one_id = " + req.body.id + ") AND id<>'" + req.body.id + "' ORDER BY profile.id;";

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

exports.addFavorite = function (req, res) {
    var start = new Date();
    var query = "INSERT INTO favorites (user_one_id, user_two_id, date) VALUES (" + req.body.my_id + ", " + req.body.profile_id + ", '" + helpers.getDateFormatted(start) + "');";
    main.client.query(query, function (err, result) {
        console.log('Query done in ' + (new Date() - start ) + 'ms with no problems');
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
};

exports.removeFavorite = function (req, res) {
    var start = new Date();
    var query = "DELETE FROM favorites WHERE user_one_id = " + req.body.my_id + " AND user_two_id = " + req.body.profile_id;
    main.client.query(query, function (err, result) {
        console.log('Query done in ' + (new Date() - start ) + 'ms with no problems');
        if (err) {
            res.status(500).json({ success: false, error: err });
        }
        else {
            res.status(200).json({ success: true, info: "Favorite removed successfully!" });
        }
    });
};

exports.getMyFavorites = function (req, res) {
    var start = new Date();
    var query = "SELECT " +
        "profile.id, " +
        "profile.name, " +
        "profile.email, " +
        "profile.age, " +
        "profile.gender, " +
        "profile.aboutme, " +
        "profile.work, " +
        "profile.education, " +
        "profile.location, " +
        "profile.status, " +
        "profile.pictures, " +
        "profile.verified, " +
        "profile.languages, " +
        "favorites.date " +
        "FROM profile INNER JOIN favorites ON profile.id = favorites.user_two_id WHERE favorites.user_one_id = " + req.body.profile_id + ";";
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

exports.doLikeOrDislike = function (req, res) {
    var start = new Date();
    var insert = "INSERT INTO relationships (user_one_id, user_two_id, liked, date) SELECT " + req.body.my_id + ", " + req.body.other_id + ", " + req.body.liked + ", '" + helpers.getDateFormatted(start) + "'";
    var update = "UPDATE relationships SET liked = " + req.body.liked + " WHERE user_one_id = " + req.body.my_id + " AND user_two_id = " + req.body.other_id;
    var query = "WITH upsert AS (" + update + " RETURNING *) " + insert + " WHERE NOT EXISTS (SELECT * FROM upsert);";
    main.client.query(query, function (err, result) {
        console.log('Query done in ' + (new Date() - start ) + 'ms with no problems');
        if (err) {
            res.status(500).json({ success: false, error: err });
        }
        else {
            start = new Date();
            var query = "SELECT * FROM relationships WHERE user_one_id = " + req.body.other_id + " AND user_two_id = " + req.body.my_id + " AND liked = 1;";
            main.client.query(query, function (err, result) {
                console.log('Query done in ' + (new Date() - start ) + 'ms');
                if (err) {
                    res.status(500).json({ success: false, error: err });
                }
                else {
                    if (result.rows.length > 0) {
                        //add a new match
                        var query = "INSERT INTO matches (user_one_id, user_two_id, date) VALUES (" + req.body.my_id + ", " + req.body.other_id + ", '" + helpers.getDateFormatted(start) + "')";
                        main.client.query(query, function (err, result) {
                            console.log('Query done in ' + (new Date() - start ) + 'ms with no problems');
                            if (err) {
                                res.status(500).json({success: false, error: err});
                            }
                            else {
                                res.status(200).json({success: true, isMatch: true});
                            }
                        });
                    }
                    else {
                        res.status(200).json({ success: true, isMatch: false });
                    }
                }
            });
        }
    });
};

exports.getMyMatches = function (req, res) {
    var start = new Date();
    var query = "SELECT * FROM matches INNER JOIN profile ON profile.id = matches.user_two_id WHERE matches.user_one_id = " + req.body.my_id + ";";
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

exports.getMyLikes = function (req, res) {
    var start = new Date();
    var query = "SELECT * FROM profile INNER JOIN relationships ON profile.id = relationships.user_one_id WHERE relationships.user_two_id = " + req.body.my_id + " AND liked = 1";
    main.client.query(query, function (err, result) {
        console.log('Query done in ' + (new Date() - start ) + 'ms with no problems');
        if (err) {
            res.status(500).json({ success: false, error: err });
        }
        else {
            res.status(200).json({ success: true, likes: result.rows });
        }
    });
};

exports.getUserInfo = function (req, res) {
    //if (req.headers.token && req.headers.token === client_token) {
        var start = new Date();
        var query = "SELECT * FROM profile WHERE id = " + req.params.id + ";";
        main.client.query(query, function (err, result) {
            console.log('Query done in ' + (new Date() - start ) + 'ms with no problems');
            if (err) {
                res.status(500).json({ success: false, error: err });
            }
            else {
                var userObj = result.rows[0];
                start = new Date();
                var query = "SELECT liked FROM relationships WHERE user_one_id = " + req.headers.my_id + " AND user_two_id = " + req.params.id + ";";
                main.client.query(query, function (err, result) {
                    console.log('Query done in ' + (new Date() - start ) + 'ms');
                    if (err) {
                        res.status(500).json({success: false, error: err});
                    }
                    else {
                        if (result.rows.length > 0) {
                            userObj.liked = result.rows[0].liked;
                        }
                        start = new Date();
                        var query = "SELECT * FROM favorites WHERE user_one_id = " + req.headers.my_id + " AND user_two_id = " + req.params.id + ";";
                        main.client.query(query, function (err, result) {
                            console.log('Query done in ' + (new Date() - start ) + 'ms');
                            if (err) {
                                res.status(500).json({success: false, error: err});
                            }
                            else {
                                userObj.favorite = result.rows.length > 0;
                                res.status(200).json({success: true, data: userObj});
                            }
                        });
                    }
                });
            }
        });
    // }
    // else {
    //     res.status(401).json({ success: false, error: "Wrong or expired token!" });
    // }
};

exports.addVisitedProfile = function (req, res) {
    var start = new Date();
    var insert = "INSERT INTO visitors (user_one_id, user_two_id, date) SELECT " + req.body.my_id + ", " + req.body.profile_id + ", '" + helpers.getDateFormatted(start) + "'";
    var update = "UPDATE visitors SET date = '" + helpers.getDateFormatted(start) + "' WHERE user_one_id = " + req.body.my_id + " AND user_two_id = " + req.body.profile_id;
    var query = "WITH upsert AS (" + update + " RETURNING *) " + insert + " WHERE NOT EXISTS (SELECT * FROM upsert);";
    console.log(query);
    main.client.query(query, function (err, result) {
        console.log('Query done in ' + (new Date() - start ) + 'ms with no problems');
        if (err) {
            res.status(500).json({ success: false, error: err });
        }
        else {
            res.status(200).json({
                success: true,
                info: "Profile marked as visited successfully!"
            });
        }
    });
};

exports.getMyVisitors = function (req, res) {
    var start = new Date();
    var query = "SELECT " +
        "profile.id, " +
        "profile.name, " +
        "profile.email, " +
        "profile.age, " +
        "profile.gender, " +
        "profile.aboutme, " +
        "profile.work, " +
        "profile.education, " +
        "profile.location, " +
        "profile.status, " +
        "profile.pictures, " +
        "profile.verified, " +
        "profile.languages, " +
        "visitors.date" +
        " FROM profile INNER JOIN visitors ON profile.id = visitors.user_one_id WHERE visitors.user_two_id = " + req.body.my_id + ";";
    main.client.query(query, function (err, result) {
        console.log('Query done in ' + (new Date() - start ) + 'ms with no problems');
        if (err) {
            res.status(500).json({ success: false, error: err });
        }
        else {
            res.status(200).json({ success: true, visitors: result.rows });
        }
    });
};

exports.search = function (req, res) {
    var start = new Date();
    var query = "SELECT * FROM profile WHERE id<> " + req.body.my_id + " AND name LIKE '%" + req.body.criteria + "%' ORDER BY id LIMIT 50";
    main.client.query(query, function (err, result) {
        console.log('Query done in ' + (new Date() - start ) + 'ms with no problems');
        if (err) {
            res.status(500).json({ success: false, error: err });
        }
        else {
            res.status(200).json({ success: true, results: result.rows });
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