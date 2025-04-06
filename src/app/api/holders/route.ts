import axios from 'axios';
import { NextResponse } from 'next/server';

const tokenAddress = '0x2425598dD959E47a294A737eE4104316864817cf';

export async function GET() {
  console.log('🔄 Fetching holder count...');

  let holderCount: number | null = null;

  try {
    const res = await axios.get(`https://base.blockscout.com/api/v2/tokens/${tokenAddress}/counters`);
    const data = res.data;

    const parsed = parseInt(data.token_holders_count, 10);
    holderCount = isNaN(parsed) ? null : parsed;
  } catch (err) {
    console.error('Error fetching from Blockscout:', err);
  }

  console.log('✅ Responding with:', {
    holders: holderCount,
  });

  return NextResponse.json({
    holders: holderCount,
  });
}
