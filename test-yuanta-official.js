import { fetchHoldings, closeBrowser } from './src/scraper.js';

async function testYuantaOfficial() {
  const target = {
    code: '00990A',
    name: '元大全球AI新經濟',
    issuer: '元大投信'
  };
  
  console.log(`[TEST] Starting official scraper for ${target.code}...`);
  const results = await fetchHoldings(target);
  
  if (results.error) {
    console.error(`[TEST] Error: ${results.message}`);
  } else {
    console.log(`[TEST] Success! Total holdings count: ${results.length}`);
    console.log('[TEST] First 3:', results.slice(0, 3).map(r => r.stockCode).join(', '));
  }
  
  await closeBrowser();
}

testYuantaOfficial();
