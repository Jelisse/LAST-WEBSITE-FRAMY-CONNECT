// Keep originals locally until the customer signs in and confirms their order.
export async function artworkFile(
  key: string,
  file?: Blob,
): Promise<Blob | undefined> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open('framy-artwork', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('files');
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
  try {
    return await new Promise((resolve, reject) => {
      const t = db.transaction('files', file ? 'readwrite' : 'readonly');
      const r = file
        ? t.objectStore('files').put(file, key)
        : t.objectStore('files').get(key);
      t.oncomplete = () => resolve(file ?? r.result);
      t.onerror = () => reject(t.error);
    });
  } finally {
    db.close();
  }
}
