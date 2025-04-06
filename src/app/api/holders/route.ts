import { NextResponse } from 'next/server';
import { getHolderCount } from '@/utils/getHolderCount';
import { holderCount, lastUpdated, updateHolderCache } from '@/utils/holderCache';

export async function GET() {
  const now = Date.now();
  const threeHours = 3 * 60 * 60 * 1000;

  if (!holderCount || now - lastUpdated > threeHours) {
    console.log('🔄 Fetching holder count...');
    const count = await getHolderCount();
    if (count !== null) updateHolderCache(count);
  }
  else
  {
    console.log('🔄 Using cache ...');
  }


  const lastUpdatedISO = lastUpdated ? new Date(lastUpdated).toISOString() : null;

  return NextResponse.json({
    holders: holderCount,
    lastUpdated: lastUpdatedISO,
  });
}
