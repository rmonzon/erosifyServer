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

function pad(n) {
    if ((n + "").length == 1) {
        return "0" + n;
    }
    return "" + n;
}

exports.expiration_date = function() {
    var _date = new Date();
    return "" + (_date.getFullYear()) + "-" + (_date.getMonth() + 24) + "-" + (_date.getDate()) + "T" + (_date.getHours() + 1) + ":" + (_date.getMinutes()) + ":" + (_date.getSeconds()) + "Z";
};