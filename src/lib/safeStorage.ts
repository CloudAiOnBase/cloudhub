export function safeStorage() {
  try {
    // Test if localStorage is usable
    const testKey = '__wagmi_test__';
    localStorage.setItem(testKey, '1');
    localStorage.removeItem(testKey);
    return window.localStorage; // localStorage is OK
  } catch {
    // localStorage blocked; fallback to in-memory storage
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    };
  }
}
