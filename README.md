### zol壁纸下载器

一个简单的爬虫小程序,专门下载zol中某一个壁纸专辑中所有的壁纸

### 使用方法

```
>> 请输入壁纸专辑的地址(以http开头): http://desk.zol.com.cn/bizhi/5638_70174_2.html
>> 请输入需要的分辨率
(1: 1024x768 2: 1280x800 3: 1280x1024 4: 1366x768 5:1440x9006: 1600x900 7: 1680x1050 8: 1920x1080 9: 2560x1600): 4
>> 开始分析壁纸专辑
>> 壁纸专辑分析完毕
>> 开始获取图片的展示地址
>> 获取图片的展示地址完毕
>> 开始解析高清壁纸地址
>> 解析高清壁纸地址完毕
>> 正在下载壁纸....
>> 所有壁纸下载完毕,请查看download_pictures文件夹

```

### Bug

因为request的error事件触发后会继续触发end事件,所以会重复调用`callback`




