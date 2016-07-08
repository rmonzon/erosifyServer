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

exports.sortArrayByDates = function (array) {
    return array.sortBy(function(o) {
        return new Date(o.sent_date);
    });
};

exports.findDuplicatesInArray = function (array) {
    var visited = {}, newArray = [];
    for (var i = 0, len = array.length; i < len; ++i) {
        if (isNaN(visited[array[i].id])) {
            visited[array[i].id] = 0;
        }
        visited[array[i].id]++;
        if (visited[array[i].id] == 2) {
            newArray.push(array[i]);
        }
    }
    return newArray;
};

/**
 * Sort 'matches' array to put first the friends of my friends
 * @param my_id
 * @param friends
 * @param matches
 * @returns {Array}
 */
exports.sortNetworkByFriendsOfFriends = function (my_id, friends, matches) {
    var hash = {};
    for (var i = 0, len = friends.length; i < len; ++i) {
        if (friends[i].id != my_id) {
            if (isNaN(hash[friends[i].id])) {
                hash[friends[i].id] = 0;
            }
            hash[friends[i].id]++;
        }
    }
    var newMatches = [];
    for (var key in hash) {
        // skip loop if the property is from prototype
        if (!hash.hasOwnProperty(key))
            continue;
        newMatches.push({num: key, count: hash[key]});
    }
    newMatches.sortBy(function (elem) {
        return elem.count;
    });
    var matchesIds = [];
    for (i = 0, len = matches.length; i < len; ++i) {
        matchesIds.push(matches[i].id);
    }
    for (i = 0, len = newMatches.length; i < len; ++i) {
        var n = parseInt(newMatches[i].num);
        var index = matchesIds.indexOf(n);
        matchesIds.splice(index, 1);
        matchesIds.splice(0, 0, n);
    }
    var finalMatches = [], pos = 0;
    for (i = 0, len = matches.length; i < len; ++i) {
        pos = matchesIds.indexOf(matches[i].id);
        if (pos >= 0) {
            finalMatches[pos] = matches[i];
        }
    }
    for (i = 0, len = finalMatches.length; i < len; ++i) {
        if (!finalMatches[i]) {
            finalMatches.splice(i, 1);
        }
    }
    return finalMatches;
};

/**
 * Custom non-enumerable sortBy function using a Schwartzian transform technique on all arrays
 */
(function () {
    if (typeof Object.defineProperty === 'function') {
        try {
            Object.defineProperty(Array.prototype, 'sortBy', {value: sb});
        } catch (e) {
        }
    }
    if (!Array.prototype.sortBy) Array.prototype.sortBy = sb;

    function sb(f) {
        for (var i = this.length; i;) {
            var o = this[--i];
            this[i] = [].concat(f.call(o, o, i), o);
        }
        this.sort(function (a, b) {
            for (var i = 0, len = a.length; i < len; ++i) {
                if (a[i] != b[i]) return a[i] < b[i] ? -1 : 1;
            }
            return 0;
        });
        for (i = this.length; i;) {
            this[--i] = this[i][this[i].length - 1];
        }
        return this;
    }
})();