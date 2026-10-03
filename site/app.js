'use strict';
const $ = id => document.getElementById(id);
let selected = null, source = null, sourceURL = null, outputURL = null, busy = false;
const sizeText = n => n >= 1000000 ? `${(n / 1000000).toFixed(2)} MB` : `${(n / 1000).toFixed(1)} KB`;
function resetOutput() {
  $('result').hidden = true;
  $('after').removeAttribute('src');
  $('download').removeAttribute('href');
  if (outputURL) URL.revokeObjectURL(outputURL);
  outputURL = null;
}
async function selectFile(file) {
  if (!file || busy) return;
  resetOutput();
  selected = null; source = null; $('compress').disabled = true;
  $('before').removeAttribute('src');
  if (sourceURL) URL.revokeObjectURL(sourceURL);
  sourceURL = null;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    $('status').textContent = '请选择 JPG、PNG 或 WebP 静态图片。'; return;
  }
  if (file.size > 50000000) { $('status').textContent = '图片超过 50 MB，请先缩小文件。'; return; }
  sourceURL = URL.createObjectURL(file);
  const image = new Image(); image.src = sourceURL;
  try {
    await image.decode();
    if (image.naturalWidth * image.naturalHeight > 50000000) throw new Error('图片超过 5000 万像素，请先缩小尺寸。');
    selected = file; source = image;
    $('status').textContent = `${file.name} · ${sizeText(file.size)} · ${image.naturalWidth} × ${image.naturalHeight}`;
    $('compress').disabled = false;
  } catch (error) { $('status').textContent = error.message.startsWith('图片超过') ? error.message : '无法读取图片，请换一张图片重试。'; }
}
$('choose').onclick = () => $('file').click();
$('file').onchange = () => { selectFile($('file').files[0]); $('file').value = ''; };
for (const event of ['dragover', 'dragleave', 'drop']) $('drop').addEventListener(event, e => {
  e.preventDefault();
  $('drop').classList.toggle('drag', event === 'dragover');
  if (event === 'drop') selectFile(e.dataTransfer.files[0]);
});
function settingsChanged() {
  resetOutput();
  for (const button of document.querySelectorAll('[data-size]')) button.setAttribute('aria-pressed', String(Number(button.dataset.size) === Number($('limit').value)));
}
for (const button of document.querySelectorAll('[data-size]')) button.onclick = () => { $('limit').value = button.dataset.size; settingsChanged(); };
$('limit').oninput = settingsChanged; $('format').onchange = settingsChanged;
function encode(canvas, type, quality) {
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob && blob.type === type ? resolve(blob) : reject(new Error('当前浏览器不支持此保存格式，请选择 JPG。')), type, quality));
}
async function compressImage(image, target, type) {
  const canvas = document.createElement('canvas');
  let width = image.naturalWidth, height = image.naturalHeight;
  while (true) {
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('浏览器无法创建图片画布，请缩小图片或换浏览器重试。');
    if (type === 'image/jpeg') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, width, height); }
    ctx.drawImage(image, 0, 0, width, height);
    let high = 0.96, low = 0.42;
    let best = await encode(canvas, type, high);
    if (best.size <= target) return {blob: best, width, height};
    best = await encode(canvas, type, low);
    if (best.size <= target) {
      for (let i = 0; i < 7; i++) {
        const quality = (low + high) / 2;
        const candidate = await encode(canvas, type, quality);
        if (candidate.size <= target) { low = quality; best = candidate; } else high = quality;
      }
      return {blob: best, width, height};
    }
    if (width === 1 && height === 1) throw new Error('这个大小限制太小，请调高目标大小。');
    const scale = Math.min(0.85, Math.sqrt(target / best.size) * 0.92);
    width = Math.max(1, Math.floor(width * scale)); height = Math.max(1, Math.floor(height * scale));
  }
}
$('compress').onclick = async () => {
  if (!selected || !source || busy) return;
  const limit = Number($('limit').value), type = $('format').value;
  if (!Number.isFinite(limit) || limit < 0.05 || limit > 50) { $('status').textContent = '请填写 0.05 到 50 MB 之间的目标大小。'; return; }
  busy = true; resetOutput();
  for (const control of document.querySelectorAll('button,input,select')) control.disabled = true;
  $('status').textContent = '正在本地压缩，请稍等…';
  try {
    const target = Math.floor(limit * 1000000) - 1;
    const result = selected.size <= target && selected.type === type
      ? {blob: selected, width: source.naturalWidth, height: source.naturalHeight, unchanged: true}
      : await compressImage(source, target, type);
    if (result.blob.size > target) throw new Error('未达到大小限制，请重试。');
    outputURL = URL.createObjectURL(result.blob);
    $('before').src = sourceURL; $('after').src = outputURL;
    $('originalSize').textContent = sizeText(selected.size); $('newSize').textContent = sizeText(result.blob.size);
    $('download').href = outputURL; $('download').download = `${selected.name.replace(/\.[^.]+$/, '')}_轻一点.${type === 'image/jpeg' ? 'jpg' : 'webp'}`;
    const saving = Math.round((1 - result.blob.size / selected.size) * 100);
    $('detail').textContent = `${result.width} × ${result.height} 像素 · ${result.blob.size.toLocaleString()} 字节 · ${result.unchanged ? '原图已符合目标，直接保留原文件与元数据。' : saving >= 0 ? `体积减少 ${saving}%。已移除原图元数据。` : '格式转换后体积有所增加，仍满足目标大小。已移除原图元数据。'}`;
    $('result').hidden = false; $('status').textContent = `已完成，文件严格小于 ${limit} MB。点击“保存图片”下载副本。`;
  } catch (error) { $('status').textContent = error.message || '压缩失败，请换一张图片重试。'; }
  finally { busy = false; for (const control of document.querySelectorAll('button,input,select')) control.disabled = false; }
};
