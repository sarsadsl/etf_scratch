// Quick probe for Yuanta download page
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
puppeteer.use(StealthPlugin());

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0');
await page.goto('https://www.yuantaetfs.com/product/detail/00990A/download', { waitUntil: 'networkidle2', timeout: 30000 });
await new Promise(r => setTimeout(r, 3000));

const btns = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('a, button'))
    .filter(e => e.offsetParent !== null)
    .map(e => ({ tag: e.tagName, text: e.innerText?.trim().slice(0,50), href: e.getAttribute('href'), cls: e.className.slice(0,50) }))
    .filter(e => e.text.length > 0);
});
console.log('Download page buttons:', JSON.stringify(btns, null, 2));
await page.screenshot({ path: 'scratch/yuanta_download.png', fullPage: true });
await browser.close();
