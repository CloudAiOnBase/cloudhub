import fs from 'fs';

export let holderCount: number | null = null;
export let lastUpdated: number = 0;

const CACHE_FILE = 'src/utils/holderCache.json'; // Path to store cache

// Read from file if it exists
export function readCache() {
  if (fs.existsSync(CACHE_FILE)) {
    const data = fs.readFileSync(CACHE_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    holderCount = parsed.holderCount;
    lastUpdated = parsed.lastUpdated || 0; // Add fallback to prevent invalid values
  }
}

// Save to file
export function updateHolderCache(count: number) {
  holderCount = count;
  lastUpdated = Date.now();
  const data = JSON.stringify({ holderCount, lastUpdated });
  fs.writeFileSync(CACHE_FILE, data); // Write to file
}

// Call this at the start to read the cache
readCache();
