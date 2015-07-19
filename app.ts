/// <reference path="typings/node/node.d.ts"/>
/// <reference path="typings/request/request.d.ts"/>

"use strict";

var async = require('async');
var request = require('request');
var cheerio = require('cheerio');
var urlModule = require('url');
var fs = require('fs');

var resolutions = [ '1024x768', '1280x800','1280x1024', '1366x768', '1440x900',
    '1600x900', '1680x1050', '1920x1080', '2560x1600'];

async.auto({
    input_album_url: function (callback, result) {
        var base_url = "http://desk.zol.com.cn/bizhi/";
        var album_url = process.argv.slice(2)[0];
        console.log(album_url);
        if (!album_url || album_url.search(base_url) === -1) {
            console.log('错误的地址');
            return false;
        }
        callback(null, album_url);
    }
    ,
    get_album: ['input_album_url', getAlbum]
    ,
    get_each_img_url: ['get_album', getEachImgUrl]
    ,
    get_img_urls: ['get_each_img_url', getImgUrls]
    ,
    download_imgs: ['get_img_urls', downloadImgs]
}, function (err, results) {
    if (err) {
        console.log('async.auto Error:' + err);
        return false;
    } else {
        console.log('All wallpapers had been downloaded successfully');
    }
});

/**
 * 找出所提供的最小的分辨率,因为必须要访问每一张图片,才能从源码解析出别的清晰度的壁纸
 * 所以,这一步骤需要更可能减少流量
 * @param $
 * @returns {string}
 */
function findMinimalResolution($):string {
    for (var i = 0; i < resolutions.length; i++) {
        if ($('#'+ resolutions[i]).length != 0) {
            return resolutions[i];
        }
    }
}

/**
 * 获取一个壁纸专辑中所有的图片的展示页的地址
 * @param callback
 * @param result
 */
function getAlbum(callback ,result) {
    var base_url = "http://desk.zol.com.cn/bizhi/";
    var album_url = result['input_album_url'];
    request({
        url: album_url,
        timeout: 5000,
        headers: {
            'User-Agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:39.0) Gecko/20100101 Firefox/39.0'
        }
    }, function (err, response, body) {
        if (err) {
            console.log('Error: ' + err.statusCode);
            callback(err.statusCode);
            return false;
        }
        if (response.statusCode === 200) {
            var $ = cheerio.load(body);
            var $imgs = $('#showImg > li > a');
            var img_urls:Array<string> = [];
            $imgs.each(function (inex, item) {
                var href = $(item).attr('href');
                href = urlModule.resolve(base_url, href);
                img_urls.push(href);
            });
            callback(null, img_urls);
        }
    })
}

/**
 * 分析出展示壁纸的高清链接
 * @param callback
 * @param result
 */
function getEachImgUrl(callback, result) {
    // 只要获取了专辑中任意一张展示壁纸的地址,就可以分析出所有的高清壁纸的url
    var img_url = result['get_album'][0];
    var base_url = "http://desk.zol.com.cn";
    request({
        url: img_url,
        timeout: 5000,
        headers: {
            'User-Agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:39.0) Gecko/20100101 Firefox/39.0'
        }
    }, function (err, response, body) {
        if (err) {
            console.log('Error: ' + err.statusCode);
            callback(err.statusCode);
        }
        if (response.statusCode === 200) {
            var $ = cheerio.load(body);
            var resolution = findMinimalResolution($);
            var img_urls:Array<string> = [];
            var $img = $('#' + resolution);
            // href的值类似于/showpic/1920x1200_67004_14.html
            var href = $img.attr('href');
            var pattern = /_\d*_/;
            // imsg_urls中每一项的字符串类似于http://desk.zol.com.cn/bizhi/5418_67004_2.html
            // 然后通过替换解析,找到高清壁纸的url,比如http://desk.zol.com.cn/showpic/1920x1080_67004_14.html
            result['get_album'].forEach(function (item, index, array) {
                // identity是壁纸图片的数字标示
                var identity = pattern.exec(item)[0];
                var url = href.replace(/_\d*_/, identity);
                url = urlModule.resolve(base_url, url);
                img_urls.push(url);
            });
            callback(null, img_urls);
        }
    })
}

/**
 * 逐个访问壁纸图片(访问的是分辨率最低的,同时也是体积最小的),然后解析出图片的地图,并把分辨率换成
 * 自己想要的
 * @param callback
 * @param result
 */
function getImgUrls(callback, result) {
    var img_urls = result['get_each_img_url'];
    async.mapLimit(img_urls, 5, function (item, callback) {
        request({
            url: item,
            timeout: 5000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:39.0) Gecko/20100101 Firefox/39.0'
            }
        }, function (err, response, body) {
            if (err) {
                console.log('Error: ' + err.statusCode);
                callback(err.statusCode);
            }
            if (response.statusCode === 200) {
                var $ = cheerio.load(body);
                var img_url = $('img').attr('src');
                img_url = img_url.replace(/\d+x\d+/, '1920x1080');
                callback(null, img_url);
            }
        });
    }, function (err, results) {
        if (err) {
            console.log('getImgUrls error: ' + err);
            callback(err);
            return false;
        }
        callback(null,results);
    });
}

function downloadImgs(callback, result) {
    if (!fs.existsSync('download_pictures/')) {
        fs.mkdirSync('download_pictures');
    }
    var img_urls = result['get_img_urls'];
    var index = 0;
    async.eachLimit(img_urls, 5, function (item, callback) {
        console.log(item);
        request({
            url: item,
            timeout: 5000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:39.0) Gecko/20100101 Firefox/39.0'
            }
        }, function (err, response, body) {
            if (err) {
                console.log('error: ' + err.statusCode + '下载 ' + item + ' 出错');
            }
        })
        .pipe(fs.createWriteStream('download_pictures/number.jpg'.replace(/number/, index +'')));
        index++;
        callback();
    })
}