// Phase 2 probing: Find Yuanta fundid and Capital download URL
import axios from 'axios';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
puppeteer.use(StealthPlugin());

const h = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0', 'Referer': 'https://www.yuantaetfs.com/' };

// 1. Find Yuanta fundid for 00990A from their page HTML
const html = await axios.get('https://www.yuantaetfs.com/product/detail/00990A/ratio', { headers: h });
const matches = [...html.data.matchAll(/(\d{3,6})/g)].map(m => m[1]);
// Look for "fundid" near any number
const fundCtx = html.data.indexOf('fundId');
console.log('fundId context (200 chars):', fundCtx !== -1 ? html.data.slice(fundCtx - 50, fundCtx + 150) : 'not found');

// 2. Try Yuanta API directly to find fund config
const fundData = await axios.get('https://www.yuantaetfs.com/api/FundData/GetAllFundsStaticData', { headers: h }).catch(() => null);
if (fundData) {
  const arr = Array.isArray(fundData.data) ? fundData.data : (fundData.data?.data || []);
  const f = arr.find(x => JSON.stringify(x).includes('00990A'));
  console.log('GetAllFundsStaticData 00990A:', JSON.stringify(f, null, 2));
} else {
  console.log('GetAllFundsStaticData failed');
}

// 3. Capital: Use puppeteer to intercept download request
console.log('Probing Capital with puppeteer...');
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
const intercepted = [];
page.on('request', req => {
  const url = req.url();
  if (url.includes('download') || url.includes('export') || url.includes('excel') || url.includes('csv') || url.includes('Download')) {
    intercepted.push({ url, method: req.method(), postData: req.postData() });
    console.log('[Capital Request]', req.method(), url);
  }
});
page.on('response', async res => {
  const url = res.url();
  const ct = res.headers()['content-type'] || '';
  if (ct.includes('excel') || ct.includes('octet') || ct.includes('spreadsheet')) {
    console.log('[Capital Binary Response]', url, ct);
  }
});
await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0');
await page.goto('https://www.capitalfund.com.tw/etf/product/detail/399/portfolio', { waitUntil: 'networkidle2', timeout: 30000 });
await new Promise(r => setTimeout(r, 3000));
// Click download button
try {
  const btn = await page.$('a[download], button[download], a[href*="download"], a[href*="excel"], a[href*="Export"]');
  if (btn) { console.log('Found download button'); await btn.click(); await new Promise(r => setTimeout(r, 3000)); }
  else {
    // Try text-based search
    const links = await page.$$eval('a, button', els => els.map(e => ({ text: e.innerText.trim(), href: e.href || '', onclick: e.getAttribute('onclick') || '' })));
    const dlLinks = links.filter(l => /下載|export|excel|csv/i.test(l.text + l.href + l.onclick));
    console.log('Potential download links:', JSON.stringify(dlLinks.slice(0, 5), null, 2));
  }
} catch(e) { console.error('Capital click error:', e.message); }
console.log('Intercepted requests:', JSON.stringify(intercepted, null, 2));
await browser.close();
