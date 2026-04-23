import { fetchHoldings, closeBrowser } from './src/scraper.js';
import fs from 'fs';

async function testYuanta() {
  const target = {
    code: '00990A',
    name: '元大全球AI新經濟',
    issuer: '元大投信'
  };
  
  console.log('Testing Yuanta Official Scraper (PCF) for 00990A...');
  const result = await fetchHoldings(target);
  
  if (result.error) {
    console.error('Error:', result.message);
  } else {
    console.log(`Success! Found ${result.length} holdings.`);
    console.log('First 10:', result.slice(0, 10));
  }
  
  await closeBrowser();
}

testYuanta();
