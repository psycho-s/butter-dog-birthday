# 黄油小狗摇滚生日专场

这是一个可以放到静态网站托管上的微信分享网页。打开后点一下按钮，小黄油狗会抱着电吉他弹唱一段原创生日嗨歌节奏。

## 个性化链接

上传后可以这样改名字：

```text
https://你的网址/?name=朋友名字
```

也可以加一句短祝福：

```text
https://你的网址/?name=朋友名字&line=明天轮到全世界为你鼓掌
```

## 分享成微信链接

把整个文件夹上传到任意静态网站托管服务即可，例如 GitHub Pages、Netlify、Vercel、Cloudflare Pages，或你自己的服务器。入口文件是 `index.html`。

## 关于音乐

页面里默认使用原创合成生日摇滚节奏，没有嵌入任何官方、平台视频或商用生日歌音频。

如果你有权使用某段音频，可以把音频放到：

```text
assets/birthday-track.mp3
```

然后在分享链接后加：

```text
?audio=custom
```

例如：

```text
https://你的网址/?name=朋友名字&audio=custom
```

## 文件

- `index.html`: 页面结构
- `styles.css`: 舞台、弹吉他和字幕动画
- `script.js`: 原创摇滚音乐、彩带、字幕和个性化链接
- `assets/birthday-rock.wav`: 手机端优先播放的内置音轨
- `assets/share-card.png`: 微信链接预览封面图
- `assets/rock-dog.png`: 透明背景电吉他小狗
- `assets/reference-dog.jpeg`: 你提供的小狗参考图
- `assets/butter-dog.png`: 第一版透明背景黄油小狗备份
- `assets/butter-dog-key.png`: 原始抠图素材备份
