/**
 * Created by raul on 4/22/16.
 */

exports.getDateFormatted = function(today) {
    var dd = today.getDate();
    var mm = today.getMonth() + 1; //January is 0!
    var yyyy = today.getFullYear();
    if (dd < 10) {
        dd = '0' + dd
    }
    if (mm < 10) {
        mm = '0' + mm
    }
    return mm + '-' + dd + '-' + yyyy;
};

exports.getDateTimeFormatted = function (date) {
    var hours = date.getHours(), minutes = date.getMinutes(), secs = date.getSeconds();
    hours = hours < 10 ? '0' + hours : hours;
    minutes = minutes < 10 ? '0' + minutes : minutes;
    secs = secs < 10 ? '0' + secs : secs;
    var time = hours + ':' + minutes + ':' + secs;
    return exports.getDateFormatted(date) + " " + time;
};

exports.expiration_date = function() {
    var _date = new Date();
    return "" + (_date.getFullYear()) + "-" + (_date.getMonth() + 24) + "-" + (_date.getDate()) + "T" + (_date.getHours() + 1) + ":" + (_date.getMinutes()) + ":" + (_date.getSeconds()) + "Z";
};

exports.removeDuplicatesMsg = function (array) {
    var visited = {}, newArray = [];
    for (var i = 0, len = array.length; i < len; ++i) {
        if (!visited[array[i].id]) {
            newArray.push(array[i]);
            visited[array[i].id] = true;
        }
    }
    return newArray;
};