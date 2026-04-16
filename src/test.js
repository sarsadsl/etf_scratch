import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

async function run() {
  let browser = null;
  try {
    browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    // Go to Basic0007.xdjhtm
    await page.goto('https://www.moneydj.com/ETF/X/Basic/Basic0007.xdjhtm?etfid=00981A.TW', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 4000));
    await page.screenshot({ path: 'src/screenshot.png' });
    
    // Dump frames
    for (const frame of page.frames()) {
      const html = await frame.content();
      if (html.includes('2330.TW') || html.includes('台積電')) {
         console.log("Found in frame:", frame.url());
         fs.writeFileSync('src/found_frame.html', html);
      }
    }
  } catch(e) {
    console.error(e);
  } finally {
    if (browser) await browser.close();
  }
}
run();
