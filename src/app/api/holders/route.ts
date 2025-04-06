import { NextResponse } from 'next/server';
import { getHolderCount } from '@/utils/getHolderCount';
import { holderCount, lastUpdated, updateHolderCache, readCache } from '@/utils/holderCache';

export async function GET() {
  const now = Date.now();
  const threeHour = 3 * 60 * 60 * 1000; // 3 hours in milliseconds

  // Ensure we have the latest cache data
  readCache();

  // If cache is expired (older than 3 hours), refresh it
  if (!holderCount || now - lastUpdated > threeHour) {
    console.log('🔄 Fetching holder count...');

    // Fetch new holder count and save it
    const count = await getHolderCount();
    if (count !== null) {
      updateHolderCache(count); // Save it to the file
    } else {
      console.error('❌ Failed to fetch holder count');
    }
  }
  else
  {
    console.log('🔄 Using cache ...');
  }

  // Return cached value with a fallback if `lastUpdated` is invalid
  const lastUpdatedISO = lastUpdated ? new Date(lastUpdated).toISOString() : 'Invalid timestamp';

  return NextResponse.json({
    holders: holderCount,
    lastUpdated: lastUpdatedISO,
  });
}
