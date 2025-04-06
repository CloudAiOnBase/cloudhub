export let holderCount: number | null = null;
export let lastUpdated: number = 0;

export function updateHolderCache(count: number) {
  holderCount = count;
  lastUpdated = Date.now();
}
