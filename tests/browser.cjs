const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
(async () => {
 const browser = await chromium.launch({headless:true});
 try {
  const page = await browser.newPage({viewport:{width:1280,height:1000}});
  const errors = [], requests = [];
  page.on('pageerror', e=>errors.push(e.message));
  page.on('request', r=>requests.push(r.url()));
  await page.goto(process.env.TEST_URL || 'http://127.0.0.1:8778/');
  const fixture = await page.evaluate(() => {
   const c = document.createElement('canvas'); c.width=2400; c.height=1800;
   const x=c.getContext('2d'), d=x.createImageData(c.width,c.height);
   let seed=13; for(let i=0;i<d.data.length;i+=4){seed=(seed*1664525+1013904223)>>>0; d.data[i]=seed&255;d.data[i+1]=(seed>>>8)&255;d.data[i+2]=(seed>>>16)&255;d.data[i+3]=255;}
   x.putImageData(d,0,0); return c.toDataURL('image/png').split(',')[1];
  });
  const input={name:'generated-noise.png',mimeType:'image/png',buffer:Buffer.from(fixture,'base64')};
  await page.locator('#file').setInputFiles(input);
  await page.locator('#compress').waitFor({state:'visible'});
  await page.waitForFunction(()=>!document.getElementById('compress').disabled);
  const count=requests.length;
  for(const limit of [2,0.05]) {
   await page.locator('#limit').fill(String(limit));
   await page.locator('#compress').click();
   await page.locator('#result').waitFor({state:'visible',timeout:60000});
   const downloadPromise=page.waitForEvent('download');
   await page.locator('#download').click(); const download=await downloadPromise;
   const bytes=await fs.readFile(await download.path()); assert(bytes.length<limit*1000000);
   assert(bytes[0]===255 && bytes[1]===216);
   console.log(`PASS JPG ${limit} MB: ${bytes.length} bytes`);
  }
  assert.equal(requests.filter(u=>!u.startsWith('blob:')).length, requests.slice(0,count).filter(u=>!u.startsWith('blob:')).length,'No image network requests');
  const transparent=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=100;c.height=80;const x=c.getContext('2d');x.fillStyle='red';x.fillRect(20,20,40,40);return c.toDataURL().split(',')[1];});
  await page.locator('#file').setInputFiles({name:'transparent.png',mimeType:'image/png',buffer:Buffer.from(transparent,'base64')});
  await page.waitForFunction(()=>!document.getElementById('compress').disabled);
  await page.locator('#format').selectOption('image/webp'); await page.locator('#limit').fill('1'); await page.locator('#compress').click(); await page.locator('#result').waitFor({state:'visible'});
  const alpha=await page.evaluate(async()=>{const img=document.getElementById('after');await img.decode();const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const x=c.getContext('2d');x.drawImage(img,0,0);return x.getImageData(0,0,1,1).data[3];});assert.equal(alpha,0);
  await page.locator('#limit').fill('0');await page.locator('#compress').click();assert.match(await page.locator('#status').textContent(),/0.05/);assert(await page.locator('#result').isHidden());
  await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.deepEqual(errors,[]); console.log('PASS transparency, invalid target, mobile layout, no runtime errors / no image upload');
  if(process.env.SCREENSHOT_PATH) await page.screenshot({path:process.env.SCREENSHOT_PATH,fullPage:true});
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
