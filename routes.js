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
    var update = "UPDATE profile SET location = '" + req.body.location + "', coordinates = '" + JSON.stringify(req.body.coords) + "', last_date_online = '" + helpers.getDateFormatted(start) + "' WHERE email = '" + req.body.email + "';";
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
    var query = "INSERT INTO profile (name, lastname, email, password, dob, gender, age, location, status, pictures, verified, languages, coordinates, signup_date, last_date_online, looking_to) VALUES (" +
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
        "" + 0 + ", " +
        "" + req.body.languages + ", " +
        "'" + JSON.stringify(req.body.coords) + "', " +
        "'" + helpers.getDateFormatted(start) + "', " +
        "'" + helpers.getDateFormatted(start) + "', " +
        "'" + req.body.looking_to + "') RETURNING *;";
    main.client.query(query, function (err, result) {
        console.log('Query done in ' + (new Date() - start ) + 'ms');
        if (err) {
            res.status(200).json({success: false, error: err});
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
        "profile.looking_to " +
        "FROM profile WHERE profile.id NOT IN (SELECT user_two_id FROM relationships WHERE user_one_id = " + req.body.id + ") AND id<>" + req.body.id + "" + filters + " ORDER BY profile.id;";
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
    var query = "UPDATE profile SET pictures = " + req.body.pics + " WHERE id = " + req.body.user_id + " RETURNING *";
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
    var query = "INSERT INTO reports (user_reporting_id, user_reported_id, reason, comments, date) VALUES (" + req.body.my_id + ", " + req.body.profile_id + ", '" + req.body.reason + "', '" + req.body.comments + "', '" + helpers.getDateFormatted(start) + "');";
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
        "WHERE id='" + req.body.user_id + "';";
    main.client.query(query, function (err, result) {
        console.log('Query done in ' + (new Date() - start ) + 'ms with no problems');
        if (err) {
            res.status(500).json({ success: false, error: err });
        }
        else {
            res.status(200).json({ success: true, info: "User profile updated successfully!" });
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

//pending for review
exports.getMessagesByConversation = function (req, res) {
    var start = new Date();
    var query = "SELECT * FROM messages WHERE sender_id = " + req.headers.my_id + " AND receiver_id = " + req.headers.user_id + " ORDER BY sent_date;";
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

//TODO: implement the rest of notification requests for the side menu
exports.getNotifications = function (req, res) {
    var start = new Date();
    var query = "SELECT COUNT(*) AS unread_msg FROM messages WHERE receiver_id = " + req.headers.my_id + " AND unread = 1";
    main.client.query(query, function (err, result) {
        console.log('Query done in ' + (new Date() - start ) + 'ms with no problems');
        if (err) {
            res.status(500).json({ success: false, error: err });
        }
        else {
            res.status(200).json({ success: true, notifications: result.rows[0].unread_msg });
        }
    });
};