// Phase 3: Get Capital download href + Yuanta fundid via API interception
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import axios from 'axios';
puppeteer.use(StealthPlugin());

// --- Yuanta: intercept XHR in the ratio page ---
console.log('=== Yuanta fundid ===');
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0');

const yuantaRequests = [];
page.on('request', req => {
  const url = req.url();
  if (url.includes('StkWeight') || url.includes('fundid') || url.includes('fundId') || url.includes('ExportToExcel')) {
    yuantaRequests.push(url);
    console.log('[Yuanta XHR]', url);
  }
});

await page.goto('https://www.yuantaetfs.com/product/detail/00990A/ratio', { waitUntil: 'networkidle2', timeout: 30000 });
await new Promise(r => setTimeout(r, 3000));

// Also try to get the export button href
const exportBtn = await page.$eval('a[href*="Export"], button[onclick*="Export"], a[href*="export"]', el => ({
  href: el.href, text: el.innerText, onclick: el.getAttribute('onclick')
})).catch(() => null);
console.log('Yuanta export button:', exportBtn);

// --- Capital: get download button href ---
console.log('\n=== Capital download URL ===');
await page.goto('https://www.capitalfund.com.tw/etf/product/detail/399/portfolio', { waitUntil: 'networkidle2', timeout: 30000 });
await new Promise(r => setTimeout(r, 3000));

const dlInfo = await page.$$eval('a, button', els => {
  return els.filter(e => /下載|下載資料|excel|xlsx|csv|export/i.test((e.innerText || '') + (e.getAttribute('href') || '') + (e.getAttribute('onclick') || '')))
    .map(e => ({ tag: e.tagName, text: e.innerText.trim().slice(0, 50), href: e.href || '', onclick: e.getAttribute('onclick') || '', 'data-url': e.getAttribute('data-url') || '' }));
});
console.log('Capital download candidates:', JSON.stringify(dlInfo, null, 2));

// Click the first likely one and intercept
page.once('request', req => { if (req.url().includes('download') || req.url().includes('excel')) console.log('INTERCEPTED:', req.url()); });
const allLinks = await page.$$eval('*', els => els.filter(e => e.innerText && /下載/.test(e.innerText)).map(e => e.outerHTML.slice(0,200)));
console.log('Elements with 下載 text:', allLinks.slice(0, 5));

await browser.close();
