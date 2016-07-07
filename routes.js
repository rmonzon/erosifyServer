var bcrypt = require('bcrypt-nodejs');
var crypto = require('crypto');
var main = require('./index');
var fs = require('fs');
var aws = require('aws-sdk');
var helpers = require('./helpers');

var client_token = "";

// var AWS_ACCESS_KEY = process.env.AWS_ACCESS_KEY;
// var AWS_SECRET_KEY = process.env.AWS_SECRET_KEY;
// var S3_BUCKET = process.env.S3_BUCKET;

//only for testing locally
var AWS_ACCESS_KEY = "AKIAIVQJ3PBHYMB4GSXQ";
var AWS_SECRET_KEY = "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";
var S3_BUCKET = "erosifyimages";

exports.authentication = function (req, res) {
    var start = new Date();
    var update = "UPDATE profile SET location = '" + req.body.location + "', coordinates = '" + JSON.stringify(req.body.coords) + "', last_date_online = '" + helpers.getDateTimeFormatted(start) + "', status = 1 WHERE email = '" + req.body.email + "';";
    var query = update + "SELECT * FROM profile WHERE email='" + req.body.email + "';";
    main.client.query(query, function (err, result) {
        console.log('Query done in ' + (new Date() - start ) + 'ms');
        if (err) {
            res.status(500).json({ success: false, error: err });
        }
        else {
            var currentUser = result.rows[0];
            //regular email authentication
            if (req.body.password) {
                if (result.rows[0]) {
                    if (bcrypt.compareSync(req.body.password, currentUser.password)) {
                        crypto.randomBytes(48, function(err, buffer) {
                            client_token = buffer.toString('hex');
                            res.status(200).json({ success: true, token: client_token, user: currentUser, info: "Authentication succeed!" });
                        });
                    }
                    else {
                        res.status(200).json({ success: false, info: "Password is incorrect!" });
                    }
                }
                else {
                    res.status(200).json({ success: false, info: "Email does not exist!" });
                }
            }
            //facebook authentication
            else {
                query = "";
                if (req.body.friends) {
                    for (var i = 0; i < req.body.friends.length; i++) {
                        query += "INSERT INTO friends (user_one_id, user_two_id) SELECT * FROM (SELECT " + currentUser.id + ", (SELECT id FROM profile " +
                            "WHERE facebook_id = '" + req.body.friends[i].id + "')) AS tmp WHERE NOT EXISTS (SELECT user_one_id, user_two_id FROM friends " +
                            "WHERE user_one_id = " + currentUser.id + " AND user_two_id = (SELECT id FROM profile WHERE " +
                            "facebook_id = '" + req.body.friends[i].id + "')) LIMIT 1;";
                    }
                }
                query += "DELETE FROM friends WHERE user_two_id IS NULL";
                main.client.query(query, function (err, result) {
                    console.log('Query done in ' + (new Date() - start ) + 'ms');
                    if (err) {
                        res.status(500).json({ success: false, error: err });
                    }
                    else {
                        crypto.randomBytes(48, function(err, buffer) {
                            client_token = buffer.toString('hex');
                            res.status(200).json({ success: true, token: client_token, user: currentUser, info: "Authentication succeed!" });
                        });
                    }
                });
            }
        }
    });
};

exports.create_account = function(req, res) {
    var start = new Date();
    var passwordEnc = bcrypt.hashSync(req.body.password);
    var query = "INSERT INTO profile (name, full_name, email, password, dob, gender, age, location, status, pictures, verified, languages, coordinates, signup_date, last_date_online, looking_to, score, premium_member) VALUES (" +
        "'" + req.body.name + "', " +
        "'" + req.body.full_name + "', " +
        "'" + req.body.email + "', " +
        "'" + passwordEnc + "', " +
        "'" + req.body.dob + "', " +
        "'" + req.body.gender + "', " +
        "" + req.body.age + ", " +
        "'" + req.body.location + "', " +
        "" + 1 + ", " +
        "" + req.body.pictures + ", " +
        "" + 0 + ", " +
        "" + req.body.languages + ", " +
        "'" + JSON.stringify(req.body.coords) + "', " +
        "'" + helpers.getDateTimeFormatted(start) + "', " +
        "'" + helpers.getDateTimeFormatted(start) + "', " +
        "'" + req.body.looking_to + "', " +
        "" + 0 + ", " +
        "" + 0 + ") RETURNING *;";
    main.client.query(query, function (err, result) {
        console.log('Query done in ' + (new Date() - start ) + 'ms');
        if (err) {
            res.status(500).json({success: false, error: err});
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
};

exports.create_account_fb = function(req, res) {
    var start = new Date();
    var query = "INSERT INTO profile (name, full_name, email, dob, gender, age, work, education, location, status, verified, languages, coordinates, signup_date, last_date_online, looking_to, score, facebook_id, premium_member, facebook_photos) VALUES (" +
        "'" + req.body.name + "', " +
        "'" + req.body.full_name + "', " +
        "'" + req.body.email + "', " +
        "'" + req.body.dob + "', " +
        "'" + req.body.gender + "', " +
        "" + req.body.age + ", " +
        "'" + req.body.work + "', " +
        "'" + req.body.education + "', " +
        "'" + req.body.location + "', " +
        "" + 1 + ", " +
        "" + 0 + ", " +
        "" + req.body.languages + ", " +
        "'" + JSON.stringify(req.body.coords) + "', " +
        "'" + helpers.getDateTimeFormatted(start) + "', " +
        "'" + helpers.getDateTimeFormatted(start) + "', " +
        "'" + req.body.looking_to + "', " +
        "" + 0 + ", " +
        "" + req.body.facebook_id + ", " +
        "" + 0 + ", " +
        "" + req.body.facebook_photos + "" +
        ") RETURNING *;";
    main.client.query(query, function (err, result) {
        console.log('Query done in ' + (new Date() - start ) + 'ms');
        if (err) {
            res.status(500).json({success: false, error: err});
        }
        else {
            var newUser = result.rows[0];
            if (req.body.friends) {
                query = "";
                for (var i = 0; i < req.body.friends.length; i++) {
                    query += "INSERT INTO friends (user_one_id, user_two_id) VALUES (" + newUser.id + ", (SELECT id FROM profile WHERE facebook_id = '" + req.body.friends[i].id + "'));";
                }
                query += "DELETE FROM friends WHERE user_two_id IS NULL";
                main.client.query(query, function (err, result) {
                    console.log('Query done in ' + (new Date() - start ) + 'ms');
                    if (err) {
                        res.status(500).json({success: false, error: err});
                    }
                    else {
                        crypto.randomBytes(48, function (err, buffer) {
                            client_token = buffer.toString('hex');
                            res.status(200).json({
                                success: true,
                                token: client_token,
                                user: newUser,
                                info: "Registration succeed!"
                            });
                        });
                    }
                });
            }
            else {
                crypto.randomBytes(48, function (err, buffer) {
                    client_token = buffer.toString('hex');
                    res.status(200).json({
                        success: true,
                        token: client_token,
                        user: newUser,
                        info: "Registration succeed!"
                    });
                });
            }
        }
    });
};

exports.me = function (req, res) {
    if (req.headers.token && req.headers.token === client_token) {
        var start = new Date();
        var query = "UPDATE profile SET status = 1 WHERE email='" + req.body.email + "' RETURNING id, name, full_name, email, gender, age, aboutme, work, education, location, status, pictures, verified, languages, coordinates, looking_to, score, facebook_id, premium_member, facebook_photos;";
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
    var filters = "";
    if (req.body.gender) {
        filters += " AND gender = '" + req.body.gender + "'";
    }
    if (req.body.looking_to) {
        filters += " AND looking_to = '" + req.body.looking_to + "'";
    }
    if (req.body.ages) {
        filters += " AND age >= " + req.body.ages.ageFrom + " AND age <= " + req.body.ages.ageTo;
    }
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
        "profile.coordinates, " +
        "profile.last_date_online, " +
        "profile.looking_to, " +
        "profile.facebook_id, " +
        "profile.facebook_photos " +
        "FROM profile WHERE profile.id NOT IN (SELECT user_two_id FROM relationships WHERE user_one_id = " + req.body.id + ") AND id<>" + req.body.id + "" + filters + " ORDER BY profile.id;";
    main.client.query(query, function (err, result) {
        console.log('Query done in ' + (new Date() - start ) + 'ms with no problems');
        if (err) {
            res.status(500).json({ success: false, error: err });
        }
        else {
            var matches = result.rows;
            //get the friends of my friends to give more relevance to the algorithm
            query = "SELECT user_two_id AS id FROM friends WHERE user_one_id IN (SELECT user_two_id FROM friends WHERE user_one_id = " + req.body.id + ")";
            main.client.query(query, function (err, result) {
                console.log('Query done in ' + (new Date() - start ) + 'ms with no problems');
                if (err) {
                    res.status(500).json({ success: false, error: err });
                }
                else {
                    matches = helpers.sortNetworkByFriendsOfFriends(req.body.id, result.rows, matches);
                    //get users who have liked me to put them at the top of the results list
                    query = "SELECT user_one_id AS id FROM relationships WHERE user_two_id = " + req.body.id + " AND liked = 1";
                    main.client.query(query, function (err, result) {
                        console.log('Query done in ' + (new Date() - start ) + 'ms with no problems');
                        if (err) {
                            res.status(500).json({ success: false, error: err });
                        }
                        else {
                            var user_likes = result.rows.map(function (item) { return item.id; }), sorted_matches = [];
                            for (var i = 0, len = matches.length; i < len; ++i) {
                                if (user_likes.indexOf(matches[i].id) >= 0) {
                                    sorted_matches.splice(0, 0, matches[i]);
                                }
                                else {
                                    sorted_matches.push(matches[i]);
                                }
                            }
                            res.status(200).json({ success: true, matches: sorted_matches });
                        }
                    });
                }
            });
        }
    });
};

exports.addFavorite = function (req, res) {
    var start = new Date();
    var query = "INSERT INTO favorites (user_one_id, user_two_id, date) VALUES (" + req.body.my_id + ", " + req.body.profile_id + ", '" + helpers.getDateTimeFormatted(start) + "');";
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
        "profile.facebook_id, " +
        "profile.facebook_photos, " +
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
    var insert = "INSERT INTO relationships (user_one_id, user_two_id, liked, date, unread) SELECT " + req.body.my_id + ", " + req.body.other_id + ", " + req.body.liked + ", '" + helpers.getDateTimeFormatted(start) + "', 1";
    var update = "UPDATE relationships SET liked = " + req.body.liked + ", unread = 1 WHERE user_one_id = " + req.body.my_id + " AND user_two_id = " + req.body.other_id;
    var query = "WITH upsert AS (" + update + " RETURNING *) " + insert + " WHERE NOT EXISTS (SELECT * FROM upsert);";
    var newScore = req.body.liked == 1 ? 2 : -1;
    query += "UPDATE profile SET score = (SELECT score FROM profile WHERE id = " + req.body.other_id + ") + " + newScore + " WHERE id = " + req.body.other_id;
    main.client.query(query, function (err, result) {
        console.log('Query done in ' + (new Date() - start ) + 'ms with no problems');
        if (err) {
            res.status(500).json({ success: false, error: err });
        }
        else {
            if (req.body.liked == 1) {
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
                            var query = "INSERT INTO matches (user_one_id, user_two_id, date, unread) VALUES (" + req.body.my_id + ", " + req.body.other_id + ", '" + helpers.getDateTimeFormatted(start) + "', 1)";
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
            else {
                res.status(200).json({ success: true, isMatch: false });
            }
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
            var matches = result.rows;
            query = "UPDATE matches SET unread = 0 WHERE user_two_id = " + req.body.my_id;
            main.client.query(query, function (err, result) {
                console.log('Query done in ' + (new Date() - start ) + 'ms with no problems');
                if (err) {
                    res.status(500).json({ success: false, error: err });
                }
                else {
                    res.status(200).json({ success: true, matches: matches });
                }
            });
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
            var likes = result.rows;
            query = "UPDATE relationships SET unread = 0 WHERE user_two_id = " + req.body.my_id;
            main.client.query(query, function (err, result) {
                console.log('Query done in ' + (new Date() - start ) + 'ms with no problems');
                if (err) {
                    res.status(500).json({ success: false, error: err });
                }
                else {
                    res.status(200).json({ success: true, likes: likes });
                }
            });
        }
    });
};

exports.getUserInfo = function (req, res) {
    //if (req.headers.token && req.headers.token === client_token) {
        var start = new Date();
        var query = "SELECT id, name, full_name, email, gender, age, aboutme, work, education, location, status, pictures, verified, languages, coordinates, looking_to, score, facebook_id, premium_member, facebook_photos FROM profile WHERE id = " + req.params.id + ";";
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
    var insert = "INSERT INTO visitors (user_one_id, user_two_id, date, unread) SELECT " + req.body.my_id + ", " + req.body.profile_id + ", '" + helpers.getDateTimeFormatted(start) + "', 1";
    var update = "UPDATE visitors SET date = '" + helpers.getDateTimeFormatted(start) + "', unread = 1 WHERE user_one_id = " + req.body.my_id + " AND user_two_id = " + req.body.profile_id;
    var query = "WITH upsert AS (" + update + " RETURNING *) " + insert + " WHERE NOT EXISTS (SELECT * FROM upsert);";
    query += "UPDATE profile SET score = (SELECT score FROM profile WHERE id = " + req.body.profile_id + ") + 1 WHERE id = " + req.body.profile_id;
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
        "profile.facebook_id, " +
        "profile.facebook_photos, " +
        "visitors.date, " +
        "visitors.unread" +
        " FROM profile INNER JOIN visitors ON profile.id = visitors.user_one_id WHERE visitors.user_two_id = " + req.body.my_id + ";";
    main.client.query(query, function (err, result) {
        console.log('Query done in ' + (new Date() - start ) + 'ms with no problems');
        if (err) {
            res.status(500).json({ success: false, error: err });
        }
        else {
            var visitors = result.rows;
            query = "UPDATE visitors SET unread = 0 WHERE user_two_id = " + req.body.my_id;
            main.client.query(query, function (err, result) {
                console.log('Query done in ' + (new Date() - start ) + 'ms with no problems');
                if (err) {
                    res.status(500).json({ success: false, error: err });
                }
                else {
                    res.status(200).json({ success: true, visitors: visitors });
                }
            });
        }
    });
};

exports.search = function (req, res) {
    var start = new Date();
    var query = "SELECT * FROM profile WHERE id<> " + req.body.my_id + " AND LOWER(name) LIKE '%" + req.body.criteria + "%' ORDER BY id LIMIT 50";
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

exports.updateUserPics = function (req, res) {
    var start = new Date();
    var subquery = [];
    if (req.body.amazon_pics) {
        subquery.push("pictures = " + req.body.amazon_pics);
    }
    if (req.body.facebook_pics) {
        subquery.push("facebook_photos = " + req.body.facebook_pics);
    }
    var query = "UPDATE profile SET " + subquery.join(', ') + " WHERE id = " + req.body.user_id + " RETURNING *";
    main.client.query(query, function (err, result) {
        console.log('Query done in ' + (new Date() - start ) + 'ms with no problems');
        if (err) {
            console.log(err);
            res.status(500).json({ success: false, error: err });
        }
        else {
            res.status(200).json({ success: true, user: result.rows[0], info: "Profile pictures updated successfully!" });
        }
    });
};

/**
 * Returns JSON containing the temporarily-signed S3 request and the anticipated URL of the image.
 */
exports.sign_s3 = function (req, res) {
    aws.config.update({accessKeyId: AWS_ACCESS_KEY, secretAccessKey: AWS_SECRET_KEY});
    var s3 = new aws.S3();
    var s3_params = {
        Bucket: S3_BUCKET,
        Key: "profiles/user_" + req.headers.user_id + "/" + req.headers.file_name,
        Expires: 60,
        ContentType: req.headers.file_type,
        ACL: 'public-read'
    };
    s3.getSignedUrl('putObject', s3_params, function (err, data) {
        if (err) {
            console.log(err);
            res.status(500).json({ success: false, error: err });
        }
        else {
            var policy = {
                "expiration": helpers.expiration_date(),
                "conditions": [
                    {"bucket": S3_BUCKET},
                    ["eq", "$Content-Type", "image/jpeg"],
                    ["starts-with", "$key", ""],
                    {"acl": 'public-read'},
                    ["content-length-range", 0, 10147483648]
                ]
            };
            policy = new Buffer(JSON.stringify(policy)).toString('base64').replace(/\n|\r/, '');
            var signature = crypto.createHmac("sha1", AWS_SECRET_KEY).update(policy).digest("base64");

            var return_data = {
                signed_request: data,
                url: 'https://' + S3_BUCKET + '.s3.amazonaws.com/profiles/user_' + req.headers.user_id + "/" + req.headers.file_name,

                //new stuff only for mobile
                baseUrl: 'https://' + S3_BUCKET + '.s3.amazonaws.com/',
                awsKey: AWS_ACCESS_KEY,
                policy: policy,
                signature: signature
            };
            res.status(200).json({ success: true, data: return_data });
        }
    });
};

/**
 * Removes a specified image from the Amazon S3 bucket
 */
exports.removePictureFromS3 = function (req, res) {
    aws.config.update({accessKeyId: AWS_ACCESS_KEY, secretAccessKey: AWS_SECRET_KEY});
    var s3 = new aws.S3();
    var params = {  Bucket: S3_BUCKET, Key: "profiles/user_" + req.headers.user_id + "/" + req.headers.file_name };
    s3.deleteObject(params, function(err, data) {
        if (err) {
            console.log(err, err.stack); // an error occurred
            res.status(500).json({ success: false, error: err.stack });
        }
        else {
            res.status(200).json({ success: true, data: data });
        }
    });
};

exports.addSubscribersToDB = function (req, res) {
    var start = new Date();
    var query = "INSERT INTO website_users (email, date, ip) VALUES ('" + req.body.email + "', '" + helpers.getDateFormatted(start) + "', '" + req.body.ip + "');";
    main.client.query(query, function (err, result) {
        console.log('Query done in ' + (new Date() - start ) + 'ms with no problems');
        if (err) {
            res.status(500).json({ success: false, error: err });
        }
        else {
            res.status(200).json({
                success: true,
                info: "User added successfully!"
            });
        }
    });
};

exports.reportUser = function (req, res) {
    var start = new Date();
    var query = "INSERT INTO reports (user_reporting_id, user_reported_id, reason, comments, date) VALUES (" + req.body.my_id + ", " + req.body.profile_id + ", '" + req.body.reason + "', '" + req.body.comments + "', '" + helpers.getDateTimeFormatted(start) + "');";
    main.client.query(query, function (err, result) {
        console.log('Query done in ' + (new Date() - start ) + 'ms with no problems');
        if (err) {
            res.status(500).json({ success: false, error: err });
        }
        else {
            res.status(200).json({
                success: true,
                info: "Report added successfully!"
            });
        }
    });
};

exports.updateUserInfo = function (req, res) {
    client_token = "";
    var looking = " ";
    if (req.body.looking_to) {
        looking = ", looking_to='" + req.body.looking_to + "'";
    }
    var start = new Date();
    var query = "UPDATE profile SET " +
        "work='" + req.body.work + "', " +
        "education='" + req.body.education + "', " +
        "aboutme='" + req.body.aboutme + "', " +
        "languages='" + req.body.languages + "'" +
        looking +
        "WHERE id='" + req.body.user_id + "' RETURNING id, name, full_name, email, gender, age, aboutme, work, education, location, status, pictures, verified, languages, coordinates, looking_to, score, facebook_id, premium_member, facebook_photos;";
    main.client.query(query, function (err, result) {
        console.log('Query done in ' + (new Date() - start ) + 'ms with no problems');
        if (err) {
            res.status(500).json({ success: false, error: err });
        }
        else {
            res.status(200).json({ success: true, user: result.rows[0], info: "User profile updated successfully!" });
        }
    });
};

exports.getMessagesByUser = function (req, res) {
    var start = new Date();
    var query = "SELECT " +
        "sender_id, " +
        "profile.name, " +
        "COUNT(sender_id) AS unread_msg " +
        "FROM messages INNER JOIN profile ON messages.sender_id = profile.id " +
        "WHERE receiver_id = " + req.headers.my_id + " AND unread = 1 GROUP BY sender_id, profile.name";
    main.client.query(query, function (err, result) {
        console.log('Query done in ' + (new Date() - start ) + 'ms with no problems');
        if (err) {
            res.status(500).json({success: false, error: err});
        }
        else {
            var unreadMsg = result.rows;
            //get messages received by me
            query = "SELECT " +
                "profile.id, " +
                "messages.receiver_id, " +
                "profile.name, " +
                "profile.gender, " +
                "profile.age, " +
                "profile.status, " +
                "profile.verified, " +
                "profile.pictures, " +
                "profile.facebook_photos, " +
                "profile.facebook_id, " +
                "messages.message, " +
                "messages.sent_date, " +
                "messages.unread " +
                "FROM profile INNER JOIN messages ON messages.sender_id = profile.id WHERE messages.receiver_id = " + req.headers.my_id + " ORDER BY messages.sent_date DESC";
            main.client.query(query, function (err, result) {
                console.log('Query done in ' + (new Date() - start) + 'ms with no problems');
                if (err) {
                    res.status(500).json({success: false, error: err});
                }
                else {
                    var messages = helpers.removeDuplicatesMsg(result.rows);
                    for (var i = 0; i < messages.length; i++) {
                        messages[i].numUnreadMsg = 0;
                        for (var j = 0; j < unreadMsg.length; j++) {
                            if (messages[i].id == unreadMsg[j].sender_id) {
                                messages[i].numUnreadMsg = unreadMsg[j].unread_msg;
                                break;
                            }
                        }
                    }
                    //get messages sent by me
                    query = "SELECT " +
                        "profile.id, " +
                        "messages.sender_id, " +
                        "profile.name, " +
                        "profile.gender, " +
                        "profile.age, " +
                        "profile.status, " +
                        "profile.verified, " +
                        "profile.pictures, " +
                        "profile.facebook_photos, " +
                        "profile.facebook_id, " +
                        "messages.message, " +
                        "messages.sent_date, " +
                        "messages.unread " +
                        "FROM profile INNER JOIN messages ON messages.receiver_id = profile.id WHERE messages.sender_id = " + req.headers.my_id + " ORDER BY messages.sent_date DESC";
                    main.client.query(query, function (err, result) {
                        console.log('Query done in ' + (new Date() - start ) + 'ms with no problems');
                        if (err) {
                            res.status(500).json({success: false, error: err});
                        }
                        else {
                            for (var i = 0; i < result.rows.length; i++) {
                                messages.push(result.rows[i]);
                            }
                            messages = helpers.removeDuplicatesMsg(messages);
                            res.status(200).json({success: true, messages: messages});
                        }
                    });
                }
            });
        }
    });
};

exports.getMessagesByConversation = function (req, res) {
    var start = new Date();
    var query = "UPDATE messages SET unread = 0 WHERE receiver_id = " + req.headers.my_id + " AND sender_id = " + req.headers.user_id + " AND unread = 1;" +
        "SELECT * FROM messages WHERE sender_id = " + req.headers.my_id + " AND receiver_id = " + req.headers.user_id + " ORDER BY sent_date;";
    main.client.query(query, function (err, result) {
        console.log('Query done in ' + (new Date() - start ) + 'ms with no problems');
        if (err) {
            res.status(500).json({success: false, error: err});
        }
        else {
            var messages = result.rows;
            start = new Date();
            query = "SELECT * FROM messages WHERE sender_id = " + req.headers.user_id + " AND receiver_id = " + req.headers.my_id + " ORDER BY sent_date;";
            main.client.query(query, function (err, result) {
                console.log('Query done in ' + (new Date() - start ) + 'ms with no problems');
                if (err) {
                    res.status(500).json({success: false, error: err});
                }
                else {
                    for (var i = 0; i < result.rows.length; i++) {
                        messages.push(result.rows[i]);
                    }
                    messages = helpers.sortArrayByDates(messages);
                    res.status(200).json({success: true, conversation: messages});
                }
            });
        }
    });
};

exports.markMessageAsViewed = function (req, res) {
    var start = new Date();
    var query = "UPDATE messages SET unread = 0 WHERE receiver_id = " + req.body.my_id + " AND sender_id = " + req.body.user_id + " AND unread = 1;";
    main.client.query(query, function (err, result) {
        console.log('Query done in ' + (new Date() - start ) + 'ms with no problems');
        if (err) {
            res.status(500).json({success: false, error: err});
        }
        else {
            res.status(200).json({success: true, info: "Message marked as viewed successfully!"});
        }
    });
};

exports.saveMessage = function (req, res) {
    var start = new Date();
    var query = "INSERT INTO messages (sender_id, receiver_id, message, sent_date, unread) VALUES (" + req.body.sender_id + ", " + req.body.receiver_id + ", '" + req.body.msg + "', '" + req.body.sent_date + "', " + req.body.unread + ");";
    main.client.query(query, function (err, result) {
        console.log('Query done in ' + (new Date() - start ) + 'ms with no problems');
        if (err) {
            res.status(500).json({ success: false, error: err });
        }
        else {
            res.status(200).json({
                success: true,
                info: "Message saved successfully!"
            });
        }
    });
};

exports.getPeopleNearby = function (req, res) {
    var start = new Date();
    var filters = "";
    if (req.body.gender) {
        filters += " AND gender = '" + req.body.gender + "'";
    }
    if (req.body.looking_to) {
        filters += " AND looking_to = '" + req.body.looking_to + "'";
    }
    if (req.body.ages) {
        filters += " AND age >= " + req.body.ages.ageFrom + " AND age <= " + req.body.ages.ageTo;
    }
    var query = "SELECT " +
        "id, " +
        "name, " +
        "age, " +
        "coordinates, " +
        "status, " +
        "verified, " +
        "pictures, " +
        "facebook_photos, " +
        "facebook_id " +
        "FROM profile WHERE id<>" + req.body.id + " AND location LIKE '%USA%' AND location LIKE '%" + req.body.state + "%'" + filters + " ORDER BY id";
    main.client.query(query, function (err, result) {
        console.log('Query done in ' + (new Date() - start ) + 'ms with no problems');
        if (err) {
            res.status(500).json({ success: false, error: err });
        }
        else {
            res.status(200).json({ success: true, people: result.rows });
        }
    });
};

exports.getCommonFriends = function (req, res) {
    var start = new Date();
    var query = "SELECT profile.id, profile.name, profile.pictures, profile.facebook_photos, profile.facebook_id FROM profile INNER JOIN friends ON profile.id = friends.user_two_id " +
        "WHERE user_one_id = " + req.params.id + ";";
    main.client.query(query, function (err, result) {
        console.log('Query done in ' + (new Date() - start ) + 'ms with no problems');
        if (err) {
            res.status(500).json({ success: false, error: err });
        }
        else {
            var listFriends = result.rows;
            query = "SELECT profile.id, profile.name, profile.pictures, profile.facebook_photos, profile.facebook_id FROM profile INNER JOIN friends ON profile.id = friends.user_two_id " +
                "WHERE user_one_id = " + req.headers.my_id + ";";
            main.client.query(query, function (err, result) {
                console.log('Query done in ' + (new Date() - start ) + 'ms with no problems');
                if (err) {
                    res.status(500).json({ success: false, error: err });
                }
                else {
                    for (var i = 0, len = result.rows.length; i < len; ++i) {
                        listFriends.push(result.rows[i]);
                    }
                    listFriends = helpers.findDuplicatesInArray(listFriends);
                    res.status(200).json({success: true, commonFriends: listFriends, total: listFriends.length});
                }
            });
        }
    });
};

exports.getNotifications = function (req, res) {
    var start = new Date();
    var notif = {unread_msg: 0, new_likes: 0, new_visitors: 0};
    var query = "SELECT COUNT(*) AS unread_msg FROM messages WHERE receiver_id = " + req.headers.my_id + " AND unread = 1";
    main.client.query(query, function (err, result) {
        console.log('Query done in ' + (new Date() - start ) + 'ms with no problems');
        if (err) {
            res.status(500).json({ success: false, error: err });
        }
        else {
            notif.unread_msg = result.rows[0].unread_msg;
            query = "SELECT COUNT(*) AS new_likes FROM relationships WHERE user_two_id = " + req.headers.my_id + " AND unread = 1";
            main.client.query(query, function (err, result) {
                console.log('Query done in ' + (new Date() - start ) + 'ms with no problems');
                if (err) {
                    res.status(500).json({ success: false, error: err });
                }
                else {
                    notif.new_likes = result.rows[0].new_likes;
                    query = "SELECT COUNT(*) AS new_visitors FROM visitors WHERE user_two_id = " + req.headers.my_id + " AND unread = 1";
                    main.client.query(query, function (err, result) {
                        console.log('Query done in ' + (new Date() - start ) + 'ms with no problems');
                        if (err) {
                            res.status(500).json({ success: false, error: err });
                        }
                        else {
                            notif.new_visitors = result.rows[0].new_visitors;
                            query = "SELECT COUNT(*) AS new_matches FROM matches WHERE user_two_id = " + req.headers.my_id + " AND unread = 1";
                            main.client.query(query, function (err, result) {
                                console.log('Query done in ' + (new Date() - start ) + 'ms with no problems');
                                if (err) {
                                    res.status(500).json({ success: false, error: err });
                                }
                                else {
                                    notif.new_matches = result.rows[0].new_matches;
                                    res.status(200).json({ success: true, notifications: notif });
                                }
                            });
                        }
                    });
                }
            });
        }
    });
};

exports.getMessagesAndLikesTotal = function (req, res) {
    var start = new Date();
    var query = "SELECT COUNT(*) AS total_msgs FROM messages WHERE receiver_id = " + req.headers.my_id + " OR sender_id = " + req.headers.my_id + ";";
    main.client.query(query, function (err, result) {
        console.log('Query done in ' + (new Date() - start ) + 'ms with no problems');
        if (err) {
            res.status(500).json({ success: false, error: err });
        }
        else {
            var totalMsgs = result.rows[0].total_msgs;
            query = "SELECT COUNT(*) AS total_likes FROM relationships WHERE user_two_id = " + req.headers.my_id + " AND liked = 1;";
            main.client.query(query, function (err, result) {
                console.log('Query done in ' + (new Date() - start ) + 'ms with no problems');
                if (err) {
                    res.status(500).json({ success: false, error: err });
                }
                else {
                    res.status(200).json({success: true, totalMsgs: totalMsgs, totalLikes: result.rows[0].total_likes});
                }
            });
        }
    });
};

exports.deleteAccount = function (req, res) {
    var start = new Date();
    var query = "SELECT * FROM profile WHERE id = " + req.body.my_id;
    main.client.query(query, function (err, result) {
        console.log('Query done in ' + (new Date() - start ) + 'ms with no problems');
        if (err) {
            res.status(500).json({ success: false, error: err });
        }
        else {
            var u = result.rows[0];
            query = "INSERT INTO deleted_accounts (" +
                "name, " +
                "full_name, " +
                "email, " +
                "password, " +
                "dob, " +
                "gender, " +
                "location, " +
                "pictures, " +
                "verified, " +
                "languages, " +
                "coordinates, " +
                "signup_date, " +
                "looking_to, " +
                "score, " +
                "premium_member, " +
                "deleted_date) VALUES (" +
                "'" + u.name + "', " +
                "'" + u.full_name + "', " +
                "'" + u.email + "', " +
                "'" + u.password + "', " +
                "'" + helpers.getDateFormatted(new Date(u.dob)) + "', " +
                "'" + u.gender + "', " +
                "'" + u.location + "', " +
                "'{" + u.pictures + "}', " +
                "" + u.verified + ", " +
                "'{" + u.languages + "}', " +
                "'" + u.coordinates + "', " +
                "'" + helpers.getDateTimeFormatted(new Date(u.signup_date)) + "', " +
                "'" + u.looking_to + "', " +
                "" + u.score + ", " +
                "" + u.premium_member + ", " +
                "'" + helpers.getDateTimeFormatted(start) + "')";
            main.client.query(query, function (err, result) {
                console.log('Query done in ' + (new Date() - start ) + 'ms with no problems');
                if (err) {
                    res.status(500).json({ success: false, error: err });
                }
                else {
                    query = "DELETE FROM profile WHERE id = " + req.body.my_id;
                    main.client.query(query, function (err, result) {
                        console.log('Query done in ' + (new Date() - start ) + 'ms with no problems');
                        if (err) {
                            res.status(500).json({ success: false, error: err });
                        }
                        else {
                            res.status(200).json({ success: true, info: "Account removed successfully!" });     
                        }
                    });
                }
            });
        }
    });
};