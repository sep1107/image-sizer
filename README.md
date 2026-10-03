# 轻一点 · 图片压缩

一个免费的浏览器本地图片压缩工具，将图片压缩到 2 MB 或指定大小。

[在线使用](https://ys.hpqq.fun/)

## 功能

- 输入静态 JPEG、PNG、WebP，输出 JPG 或 WebP。
- 默认严格小于 2,000,000 字节，支持 500 KB、1 MB、2 MB、5 MB 和自定义 0.05～50 MB。
- 优先调整编码质量，需要时按比例缩小分辨率，不裁剪图片。
- 预览压缩前后图片，显示实际字节数，下载副本。
- WebP 保留透明背景，JPG 将透明区域填白。
- 图片仅在浏览器本地处理，无上传接口、第三方脚本或分析工具。

## 本地运行

无需安装依赖或构建：

```sh
python3 -m http.server 8080 --directory site
```

打开 http://localhost:8080/ 。也可以将 `site/` 的五个文件发布到静态托管平台。

## 限制

单张输入不超过 50 MB 或 5000 万像素。暂不支持 HEIC 和 GIF 动画，不保证保留 WebP／PNG 动画。浏览器的内存和解码能力可能低于输入上限。

压缩是有损处理，请保留原图并检查结果。重新编码移除原图 EXIF 等元数据；原文件格式一致且已满足大小目标时，直接保留原文件与元数据。移动端下载行为由浏览器决定；Safari 和真实手机相册保存尚未实测。

## 验证

安装 Node.js 和 Playwright 后，启动本地站点，运行：

```sh
npm install --no-save playwright
npx playwright install chromium
TEST_URL=http://localhost:8080/ node tests/browser.cjs
```

测试仅使用程序生成的噪声和透明图片，检查大小上限、JPEG 下载、WebP 透明度、非法目标、手机布局以及无图片网络请求。

正式部署应通过响应头设置 CSP，例如：

```text
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob:; connect-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'
```

## 目录

- `site/`：全部公开网页源码。
- `tests/`：浏览器验收脚本。

仓库不包含私人图片、服务器配置、身份文件或部署凭据。
