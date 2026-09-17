export function clearPrivateDeviceData() {
  for (const storage of [localStorage, sessionStorage]) {
    for (const key of Object.keys(storage)) {
      if (
        key.startsWith('framy-checkout:') ||
        key.startsWith('framy-purchase-plan:')
      )
        storage.removeItem(key);
    }
  }
  indexedDB.deleteDatabase('framy-artwork');
}
