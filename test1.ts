/// <reference path="typings/node/node.d.ts"/>
/// <reference path="typings/request/request.d.ts"/>

var request = require('request');
request({
    url: 'http://www.baidu.com'
}, function (err, response, body) {
    if (err) {
        console.log(err.statusCode);
    }
    console.log(response.statusCode);
    console.log(body);
});
