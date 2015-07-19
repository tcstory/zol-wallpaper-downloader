/// <reference path="typings/node/node.d.ts"/>
/// <reference path="typings/request/request.d.ts"/>
var fs = require('fs');
var request = require('request');
var async = require('async');
async.parallel([function (callback) {
        request({
            url: 'http://b.zol-img.com.cn/desk/bizhi/image/6/1366x768/1437119507613.jpg',
            headers: {
                'User-Agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:39.0) Gecko/20100101 Firefox/39.0'
            }
        }, function (error, response, body) {
            if (error) {
                console.log(error.statusCode);
                return false;
            }
            if (response.statusCode === 200) {
                console.dir(response.headers);
            }
        }).pipe(fs.createWriteStream("download_files/test1.jpg"));
        callback(null);
    }, function (callback) {
        request({
            url: 'http://b.zol-img.com.cn/desk/bizhi/image/6/1366x768/1436775031421.jpg',
            headers: {
                'User-Agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:39.0) Gecko/20100101 Firefox/39.0'
            }
        }, function (error, response, body) {
            if (error) {
                console.log(error.statusCode);
                return false;
            }
            if (response.statusCode === 200) {
                console.dir(response.headers);
            }
        }).pipe(fs.createWriteStream("download_files/test2.jpg"));
        callback(null);
    }], function (err, results) {
    if (err) {
        console.log(err);
    }
    else {
        console.log('Succeed');
    }
});
//# sourceMappingURL=test.js.map