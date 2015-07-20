/// <reference path="typings/node/node.d.ts"/>
/// <reference path="typings/request/request.d.ts"/>
"use strict";
var async = require('async');
var request = require('request');
var cheerio = require('cheerio');
var urlModule = require('url');
var fs = require('fs');
var readline = require('readline');
var colors = require('colors');
var iconv = require('iconv-lite');
var curResolution = '';
var resolutions = ['1024x768', '1280x800', '1280x1024', '1366x768', '1440x900',
    '1600x900', '1680x1050', '1920x1080', '2560x1600'];
var titleOfWallpaperAlbum = '';
var configMap = {
    numberOfParallel: 5,
    timeout: 5000,
    userAgent: 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:39.0) Gecko/20100101 Firefox/39.0'
};
async.auto({
    input_album_url: function (callback, result) {
        var rl1 = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        var base_url = "http://desk.zol.com.cn/bizhi/";
        var album_url = '';
        rl1.question('请输入壁纸专辑的地址(以http开头): ', function (answer) {
            album_url = answer;
            if (!album_url || album_url.search(base_url) === -1) {
                callback(colors.red('错误的地址'));
                rl1.close();
                return false;
            }
            rl1.close();
            var rl2 = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });
            rl2.question('请输入需要的分辨率\n' +
                '(1: 1024x768 2: 1280x800 3: 1280x1024 4: 1366x768 5:1440x900' +
                '6: 1600x900 7: 1680x1050 8: 1920x1080 9: 2560x1600): ', function (answer) {
                curResolution = resolutions[answer - 1];
                if (!curResolution) {
                    callback('没有这个分辨率');
                }
                else {
                    callback(null, album_url);
                }
                rl2.close();
            });
        });
    },
    get_album: ['input_album_url', getAlbum],
    get_each_img_url: ['get_album', getEachImgUrl],
    get_img_urls: ['get_each_img_url', getImgUrls],
    download_imgs: ['get_img_urls', downloadImgs]
}, function (err, results) {
    if (err) {
        console.log(err);
    }
    else {
        console.log(colors.green('所有壁纸下载完毕,请查看download_pictures文件夹'));
    }
});
/**
 * 获取一个壁纸专辑中所有的图片的展示页的地址
 * @param callback
 * @param result
 */
function getAlbum(callback, result) {
    console.log('开始分析壁纸专辑');
    var base_url = "http://desk.zol.com.cn/bizhi/";
    var album_url = result['input_album_url'];
    request({
        url: album_url,
        timeout: configMap.timeout,
        headers: {
            'User-Agent': configMap.userAgent
        },
        encoding: null // 为了让icon能正确解码body,这样body的格式就是buffer
    }, function (err, response, body) {
        if (err) {
            callback('getAlbum Error: ' + err);
            return false;
        }
        if (response.statusCode === 200) {
            var html = iconv.decode(body, 'gb2312');
            var $ = cheerio.load(html);
            titleOfWallpaperAlbum = $('title').text();
            // 有时候标题会是这样,<西藏美丽风光高清桌面壁纸 第7页-ZOL桌面壁纸>
            // 空格后门的内容是没有必要的,而且空格的存在也会导致创建目录失败
            titleOfWallpaperAlbum = titleOfWallpaperAlbum.trim();
            var pos = titleOfWallpaperAlbum.indexOf('壁纸');
            if (pos != -1) {
                titleOfWallpaperAlbum = titleOfWallpaperAlbum.slice(0, pos + 2);
            }
            var $imgs = $('#showImg > li > a');
            var img_urls = [];
            $imgs.each(function (inex, item) {
                var href = $(item).attr('href');
                href = urlModule.resolve(base_url, href);
                img_urls.push(href);
            });
            callback(null, img_urls);
        }
    });
}
/**
 * 分析出展示壁纸的高清链接
 * @param callback
 * @param result
 */
function getEachImgUrl(callback, result) {
    console.log('壁纸专辑分析完毕');
    console.log('开始获取图片的展示地址');
    // 只要获取了专辑中任意一张展示壁纸的地址,就可以分析出所有的高清壁纸的url
    var img_url = result['get_album'][0];
    var base_url = "http://desk.zol.com.cn";
    request({
        url: img_url,
        timeout: configMap.timeout,
        headers: {
            'User-Agent': configMap.userAgent
        }
    }, function (err, response, body) {
        if (err) {
            callback('getEachImgUrl Error: ' + err);
        }
        if (response.statusCode === 200) {
            var $ = cheerio.load(body);
            var img_urls = [];
            var $img = $('#' + curResolution);
            // href的值类似于/showpic/1920x1200_67004_14.html
            var href = $img.attr('href');
            var pattern = /_\d*_/;
            // imsg_urls中每一项的字符串类似于http://desk.zol.com.cn/bizhi/5418_67004_2.html
            // 然后通过替换解析,找到展示高清壁纸的url,比如http://desk.zol.com.cn/showpic/1920x1080_67004_14.html
            result['get_album'].forEach(function (item, index, array) {
                // identity是壁纸图片的数字标示
                var identity = pattern.exec(item)[0];
                var url = href.replace(/_\d*_/, identity);
                url = urlModule.resolve(base_url, url);
                img_urls.push(url);
            });
            callback(null, img_urls);
        }
    });
}
/**
 * 访问每一张壁纸的展示地址,然后解析出高清壁纸
 * @param callback
 * @param result
 */
function getImgUrls(callback, result) {
    console.log('获取图片的展示地址完毕');
    console.log('开始解析高清壁纸地址');
    var img_urls = result['get_each_img_url'];
    async.mapLimit(img_urls, configMap.numberOfParallel, function (item, callback) {
        request({
            url: item,
            timeout: configMap.timeout,
            headers: {
                'User-Agent': configMap.userAgent
            }
        }, function (err, response, body) {
            if (err) {
                console.log('getImgUrls| 访问' + item + '失败| Error: ' + err);
                callback(null);
            }
            if (response.statusCode === 200) {
                var $ = cheerio.load(body);
                var img_url = $('img').attr('src');
                img_url = img_url.replace(/\d+x\d+/, curResolution);
                callback(null, img_url);
            }
        });
    }, function (err, results) {
        console.log('解析高清壁纸地址完毕');
        callback(null, results);
    });
}
/**
 * 下载高清壁纸
 * @param callback
 * @param result
 */
function downloadImgs(callback, result) {
    var baseDirPath = 'download_pictures/' + titleOfWallpaperAlbum + '/';
    if (!fs.existsSync(baseDirPath)) {
        fs.mkdirSync(baseDirPath);
    }
    var img_urls = result['get_img_urls'];
    var index = 0;
    console.log('正在下载壁纸....');
    async.eachLimit(img_urls, configMap.numberOfParallel, function (item, callback) {
        var request_stream = request({
            url: item,
            timeout: configMap.timeout,
            headers: {
                'User-Agent': configMap.userAgent
            }
        });
        request_stream.on('error', function (error) {
            console.log(colors.red('downloadImgs| 下载 ' + item + ' 失败| Error: ' + error));
        });
        request_stream.on('response', function (response) {
            // 我也不知道有时候response为啥会为空,所以为了避免出现response为空的情况
            // 我使用了事件监听的方式来处理数据
            if (response.statusCode === 404) {
                console.log(colors.red('downloadImgs| 无效的下载地址 ' + item));
            }
            else {
                var str = baseDirPath + index + '.jpg';
                // 虽然下面这条命令会马上执行完毕,但是可能数据还是没有下载完成,所以需要监听end事件
                request_stream.pipe(fs.createWriteStream(str));
                index++;
            }
        });
        request_stream.on('end', function () {
            callback();
        });
    }, function (error) {
        callback();
    });
}
//# sourceMappingURL=app.js.map