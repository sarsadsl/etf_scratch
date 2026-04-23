import axios from 'axios';

async function testYuantaApi() {
  const fundCode = '00990A';
  const url = `https://www.yuantaetfs.com/api/StkRatio/GetStkRatio?fundid=${fundCode}`;
  console.log(`Testing Yuanta JSON API for ${fundCode}...`);

  try {
    const res = await axios.get(url, {
      headers: {
        'Referer': `https://www.yuantaetfs.com/product/detail/${fundCode}/ratio`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 30000
    });

    console.log('Response status:', res.status);
    console.log('Response data:', JSON.stringify(res.data).substring(0, 500));
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
       console.error('Response Status:', error.response.status);
       console.error('Response Body:', error.response.data);
    }
  }
}

testYuantaApi();
