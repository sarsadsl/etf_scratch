import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

async function intercept() {
  const browser = await puppeteer.launch({ headless: 'new' });
  
  console.log('Intercepting Nomura...');
  let page = await browser.newPage();
  page.on('response', async res => {
      const url = res.url();
      if (url.includes('.json') || url.includes('/api/')) {
          try {
              const text = await res.text();
              if (text.includes('2330') || text.includes('2308') || text.includes('台積電')) {
                  console.log('[Nomura API Match!] URL: ', url);
              }
          } catch(e) {}
      }
  });
  await page.goto('https://www.nomurafunds.com.tw/ETFWEB/pcf?fundNo=00980A', {waitUntil: 'networkidle2'});
  await new Promise(r => setTimeout(r, 2000));
  await page.close();

  console.log('Intercepting Capital...');
  page = await browser.newPage();
  page.on('response', async res => {
      const url = res.url();
      const content = res.headers()['content-type'];
      if (content && content.includes('application/json')) {
          try {
              const text = await res.text();
              if (text.includes('2330') || text.includes('基金') || text.includes('股票')) {
                  console.log('[Capital API Match!] URL: ', url);
                  console.log(text.substring(0, 200));
              }
          } catch(e) {}
      }
  });
  await page.goto('https://www.capitalfund.com.tw/etf/product/detail/399/portfolio', {waitUntil: 'networkidle2'});
  await new Promise(r => setTimeout(r, 4000));

  await browser.close();
}

intercept();
