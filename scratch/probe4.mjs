// Targeted probe: intercept all requests when clicking Capital download
// and intercept Yuanta XHR data API
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
puppeteer.use(StealthPlugin());

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'], defaultViewport: { width: 1280, height: 800 } });
const page = await browser.newPage();
await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0');

// === Yuanta: intercept all XHR/fetch on ratio page ===
console.log('=== Yuanta API calls ===');
const yuantaApis = [];
page.on('request', req => {
  const url = req.url();
  if (url.includes('/api/') || url.includes('.json')) {
    yuantaApis.push({ url, method: req.method() });
  }
});
page.on('response', async res => {
  const url = res.url();
  const ct = res.headers()['content-type'] || '';
  if (url.includes('/api/StkWeight') || url.includes('/api/Fund')) {
    try {
      const body = await res.json().catch(() => res.text());
      console.log('[Yuanta API Response]', url, '->', typeof body === 'string' ? body.slice(0, 100) : JSON.stringify(body).slice(0, 200));
    } catch {}
  }
});
await page.goto('https://www.yuantaetfs.com/product/detail/00990A/ratio', { waitUntil: 'networkidle2', timeout: 30000 });
await new Promise(r => setTimeout(r, 4000));
const mainApis = yuantaApis.filter(u => u.url.includes('/api/'));
console.log('Yuanta API calls captured:', mainApis.map(u => u.url));

// === Capital: click download and capture response ===
console.log('\n=== Capital download button click ===');
const capitalResponses = [];
page.on('response', async res => {
  const url = res.url();
  const ct = res.headers()['content-type'] || '';
  const cd = res.headers()['content-disposition'] || '';
  if (ct.includes('octet') || ct.includes('excel') || ct.includes('spreadsheet') || cd.includes('attachment')) {
    try {
      const buf = await res.buffer();
      console.log('[Capital Binary]', url, ct, 'size:', buf.length);
      fs.writeFileSync('scratch/capital_download_probe.bin', buf);
      capitalResponses.push({ url, ct, size: buf.length });
    } catch(e) { console.log('buffer error:', e.message); }
  }
  if (url.includes('capital') && url.includes('/api/')) {
    console.log('[Capital API]', url, res.status());
  }
});
page.on('request', req => {
  if (req.url().includes('capitalfund') && req.url().includes('/api/')) {
    console.log('[Capital API Request]', req.method(), req.url(), req.postData()?.slice(0, 100));
  }
});

await page.goto('https://www.capitalfund.com.tw/etf/product/detail/399/portfolio', { waitUntil: 'networkidle2', timeout: 30000 });
await new Promise(r => setTimeout(r, 4000));

// Click the 下載資料 button
const clicked = await page.evaluate(() => {
  const btns = Array.from(document.querySelectorAll('button, a'));
  const btn = btns.find(b => b.textContent.trim().includes('下載資料'));
  if (btn) { btn.click(); return { found: true, text: btn.textContent.trim() }; }
  return { found: false };
});
console.log('Click result:', clicked);
await new Promise(r => setTimeout(r, 4000));
console.log('Capital binary responses:', capitalResponses);

await browser.close();
