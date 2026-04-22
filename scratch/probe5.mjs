// Check Yuanta ExportToExcel content, and use CDP to capture Capital download
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
puppeteer.use(StealthPlugin());

const H = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0', 'Referer': 'https://www.yuantaetfs.com/' };

// 1. Inspect what fundid=1233 actually returns
console.log('=== Yuanta ExportToExcel content check ===');
const r = await axios.get('https://www.yuantaetfs.com/api/StkWeights/ExportToExcel?fundid=1233', { headers: H, responseType: 'arraybuffer' });
const preview = Buffer.from(r.data).slice(0, 500).toString('utf8', 0, 500);
console.log('Preview (first 500 chars):', preview);
// Is it xlsx magic bytes?
const magic = Buffer.from(r.data).slice(0, 4).toString('hex');
console.log('Magic bytes:', magic, '(xlsx = 504b0304, html = 3c21 or 3c68)');

// 2. Get Capital download using CDP
console.log('\n=== Capital CDP download ===');
const downloadPath = path.resolve('scratch/capital_downloads');
fs.mkdirSync(downloadPath, { recursive: true });

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage();
// Use CDP to configure download behavior
const client = await page.createCDPSession();
await client.send('Browser.setDownloadBehavior', {
  behavior: 'allow',
  downloadPath,
  eventsEnabled: true
});
client.on('Browser.downloadWillBegin', ({ guid, url, suggestedFilename }) => {
  console.log('Capital download will begin:', { guid, url, suggestedFilename });
});
client.on('Browser.downloadProgress', ({ guid, state }) => {
  if (state === 'completed') console.log('Capital download completed:', guid);
});

await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0');
await page.goto('https://www.capitalfund.com.tw/etf/product/detail/399/portfolio', { waitUntil: 'networkidle2', timeout: 30000 });
await new Promise(r => setTimeout(r, 3000));

const btnClicked = await page.evaluate(() => {
  const btns = Array.from(document.querySelectorAll('button'));
  const btn = btns.find(b => b.textContent.includes('下載資料'));
  if (btn) { btn.click(); return true; }
  return false;
});
console.log('Capital btn clicked:', btnClicked);
await new Promise(r => setTimeout(r, 5000));

const files = fs.readdirSync(downloadPath);
console.log('Downloaded files:', files);
if (files.length > 0) {
  const f = files[0];
  const stat = fs.statSync(path.join(downloadPath, f));
  console.log('File:', f, 'size:', stat.size);
}

// 3. Try Yuanta - intercept all requests during page load
console.log('\n=== Yuanta API calls ===');
const page2 = await browser.newPage();
await page2.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0');
const yuantaApis = [];
page2.on('request', req => { if (req.url().includes('/api/') && req.url().includes('yuantaetfs')) { yuantaApis.push(req.url()); } });
await page2.goto('https://www.yuantaetfs.com/product/detail/00990A/ratio', { waitUntil: 'networkidle2', timeout: 30000 });
await new Promise(r => setTimeout(r, 4000));
console.log('Yuanta API calls:', yuantaApis);

await browser.close();
