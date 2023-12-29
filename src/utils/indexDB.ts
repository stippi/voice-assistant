const openDatabase = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const openDB = indexedDB.open("VoiceAssistant", 1);
    openDB.onupgradeneeded = function() {
      const db = openDB.result;
      db.createObjectStore("data");
    };
    openDB.onsuccess = function() {
      resolve(openDB.result);
    };
    openDB.onerror = function() {
      reject(openDB.error);
    };
  });
};

export const indexDbPut = async <T>(key: string, value: T): Promise<void> => {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("data", "readwrite");
    const store = transaction.objectStore("data");
    const request = store.put(value, key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const indexDbGet = async <T>(key: string): Promise<T> => {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("data");
    const store = transaction.objectStore("data");
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result as T);
    request.onerror = () => reject(request.error);
  });
};