// Probe: Find the exact export buttons for FSITC and Yuanta
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
puppeteer.use(StealthPlugin());

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'], defaultViewport: { width: 1280, height: 800 } });
const page = await browser.newPage();
await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0');
const client = await page.createCDPSession();
await client.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: 'C:/Users/a1430/.gemini/antigravity/scratch/etf-tracker/scratch/', eventsEnabled: true });
client.on('Browser.downloadWillBegin', e => console.log('CDP DOWNLOAD BEGIN:', e.suggestedFilename, e.url?.slice(0,80)));
client.on('Browser.downloadProgress', e => { if (e.state === 'completed') console.log('CDP DOWNLOAD DONE!'); });

// ── FSITC: check what happens in Info page, tab 投資組合, export button ──
console.log('=== FSITC Info page analysis ===');
page.on('response', async res => {
  const url = res.url();
  const ct = res.headers()['content-type'] || '';
  const cd = res.headers()['content-disposition'] || '';
  if (ct.includes('spreadsheet') || ct.includes('excel') || ct.includes('octet') || cd.includes('attachment')) {
    console.log('[FSITC Binary Response]', url, ct, cd);
  }
});

await page.goto('https://www.ezmoney.com.tw/ETF/Fund/Info?fundCode=49YTW', { waitUntil: 'networkidle2', timeout: 30000 });
await new Promise(r => setTimeout(r, 5000));

// Find all download-related buttons/links
const fsitcBtns = await page.evaluate(() => {
  const all = Array.from(document.querySelectorAll('a, button, span, div'));
  return all
    .filter(e => /匯出|下載|excel|xlsx|export/i.test(e.innerText || e.className || e.getAttribute('href') || ''))
    .map(e => ({ tag: e.tagName, text: e.innerText?.trim().slice(0,50), cls: e.className, href: e.getAttribute('href'), id: e.id }))
    .slice(0, 20);
});
console.log('FSITC download elements:', JSON.stringify(fsitcBtns, null, 2));

// Try to scroll and find 投資組合 tab
await page.evaluate(() => window.scrollTo(0, 500));
await new Promise(r => setTimeout(r, 1000));
const tabClicked = await page.evaluate(() => {
  const tabs = Array.from(document.querySelectorAll('a, li, button, div[role="tab"]'));
  const tab = tabs.find(t => t.innerText?.includes('投資組合'));
  if (tab) { tab.click(); return tab.innerText; }
  return null;
});
console.log('Tab clicked:', tabClicked);
await new Promise(r => setTimeout(r, 2000));

// Now find export button after tab click
const afterTabBtns = await page.evaluate(() => {
  const all = Array.from(document.querySelectorAll('a, button'));
  return all.filter(e => /匯出|下載|excel|xlsx|export/i.test(e.innerText || '')).map(e => ({ tag: e.tagName, text: e.innerText?.trim(), href: e.href || '' }));
});
console.log('After tab click download buttons:', JSON.stringify(afterTabBtns, null, 2));

// Click export if found
if (afterTabBtns.length > 0) {
  await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('a, button'));
    const btn = all.find(e => /匯出|excel|xlsx/i.test(e.innerText || ''));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 5000));
}

// ── Yuanta: check ratio page buttons more carefully ──
console.log('\n=== Yuanta ratio page analysis ===');
await page.goto('https://www.yuantaetfs.com/product/detail/00990A/ratio', { waitUntil: 'networkidle2', timeout: 40000 });
await new Promise(r => setTimeout(r, 4000));
await page.evaluate(() => window.scrollTo(0, 2000)); // scroll down
await new Promise(r => setTimeout(r, 2000));

const yuantaBtns = await page.evaluate(() => {
  const all = Array.from(document.querySelectorAll('button, a, span[role], div[role="button"], .btn'));
  return all
    .filter(e => e.offsetParent !== null) // visible only
    .map(e => ({ tag: e.tagName, text: e.innerText?.trim().slice(0, 40), cls: e.className.slice(0,60), type: e.getAttribute('type'), href: e.getAttribute('href') }))
    .filter(e => e.text.length > 0)
    .slice(0, 30);
});
console.log('Yuanta visible buttons:', JSON.stringify(yuantaBtns, null, 2));

// Also take a screenshot for visual inspection
await page.screenshot({ path: 'scratch/yuanta_ratio.png', fullPage: false });
console.log('Screenshot saved to scratch/yuanta_ratio.png');

await browser.close();
