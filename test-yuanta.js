import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('api') && !url.includes('google')) {
      try {
        const text = await response.text();
        console.log(`\n=== API Found ===\nURL: ${url}\nData: ${text.substring(0, 500)}`);
      } catch (e) {}
    }
  });

  try {
    await page.goto('https://www.yuantaetfs.com/product/detail/00990A/ratio', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 6000));
  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
  }
})();
