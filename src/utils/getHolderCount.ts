import axios from 'axios';
import * as cheerio from 'cheerio';

const tokenAddress = '0x2425598dD959E47a294A737eE4104316864817cf'; // change this

export async function getHolderCount(): Promise<number | null> {
  try {
    const url = `https://basescan.org/token/${tokenAddress}`;
    const res = await axios.get(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36',
      },
    });

    const $ = cheerio.load(res.data);
    const holderText = $('#ContentPlaceHolder1_tr_tokenHolders .d-flex div').first().text().trim();
    const count = parseInt(holderText.replace(/,/g, ''));

    return isNaN(count) ? null : count;
  } catch (err) {
    console.error('Error fetching holder count:', err);
    return null;
  }
}
