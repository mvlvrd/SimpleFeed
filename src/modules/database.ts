import { READ, CONFIGS, SchemaVersion } from "../config.ts";
import type { Status, schemaType } from "../config.ts";

const _dbName = "simpleFeedDB";

type IDBSchemaType = {
  name: schemaType;
  keyOptions: { keyPath: string };
  idx: "readStatus";
};

function generateSchemaFromConfig(): IDBSchemaType[] {
  return Object.entries(CONFIGS).map(([name, site]) => {
    return {
      name: name as schemaType,
      keyOptions: { keyPath: site.keyPath },
      idx: "readStatus",
    };
  });
}

const schema = generateSchemaFromConfig();

async function fetchAndParse<K extends schemaType>(schemaName: K) {
  const { url, elListSelector, getter } = CONFIGS[schemaName];
  return fetch(url)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.text();
    })
    .then((text) => {
      const parser = new DOMParser();
      const els = parser
        .parseFromString(text, "text/html")
        .querySelectorAll(elListSelector);
      return Array.from(els).map((el) => getter(el as HTMLElement));
    })
    .catch((error) => {
      console.error("Fetch failed:", error);
      browser.notifications.create({
        type: "basic",
        iconUrl: "icons/rss.png",
        title: `Fetch ${url} failed`,
        message: error.message,
      });
      throw error;
    });
}

export const Database = {
  _db: null as IDBDatabase | null,

  ensureDB() {
    if (!this._db) {
      throw new Error("Database is not initialized"); //TODO: Check if init should be done.
    }
    return this._db;
  },

  async init(dbVersion = SchemaVersion) {
    if (this._db) return;
    console.log("Initialize DB");
    const request = indexedDB.open(_dbName, dbVersion);
    this._db = await new Promise((resolve, reject) => {
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest)?.result;
        if (db === undefined) throw new Error("Database unitialized.");
        //TODO: Check the logic here is robust.
        //Delete deprecated Object Stores
        const newNames = schema.map((x) => x.name);
        const existingNames = db.objectStoreNames;
        const n = existingNames.length;
        for (let i = 0; i < n; i++) {
          const existingName = existingNames.item(i) as schemaType;
          if (existingName === null) {
            continue;
          }
          if (!newNames.includes(existingName)) {
            db.deleteObjectStore(existingName);
          }
        }
        //Create new Object Stores
        const newExistingNames = db.objectStoreNames;
        schema.forEach(({ name, keyOptions, idx }) => {
          if (!newExistingNames.contains(name)) {
            db.createObjectStore(name, keyOptions).createIndex(idx, idx, {
              unique: false,
            });
          }
        });
      };

      request.onerror = () => {
        console.error(`Error initializing IndexedDB: ${request.error}`);
        reject(request.error);
      };

      request.onsuccess = () => {
        resolve(request.result);
      };
    });
  },

  async clear() {
    const schemaNames = schema.map((x) => x.name);
    const transaction = this.ensureDB().transaction(schemaNames, "readwrite");
    const promise = this._transactionPromise(transaction);
    schemaNames.forEach((name) => transaction.objectStore(name).clear());
    return promise;
  },

  async updateAll() {
    return Promise.allSettled(schema.map((x) => this.update(x.name)));
  },

  async update<K extends schemaType>(schemaName: K) {
    const { keyPath, getUpdateStatus } = CONFIGS[schemaName];
    const items = await fetchAndParse(schemaName);
    const transaction = this.ensureDB().transaction([schemaName], "readwrite");
    const promise = this._transactionPromise(transaction);
    const objectStore = transaction.objectStore(schemaName);

    const getAllRequest = objectStore.getAll();
    getAllRequest.onsuccess = () => {
      const existingMap = new Map(
        getAllRequest.result.map((item) => [item[keyPath], item]),
      );
      items.forEach((item) => {
        const { needsUpdate, readStatus } = getUpdateStatus(item, existingMap);
        if (needsUpdate) {
          objectStore.put({ ...item, readStatus: readStatus });
        }
      });
    };
    getAllRequest.onerror = () => {
      console.error(getAllRequest.error);
      transaction.abort();
    };
    return promise;
  },

  _readRequestPromise<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  _transactionPromise(transaction: IDBTransaction): Promise<void> {
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        resolve();
      };
      transaction.onerror = (event: Event) => {
        const target = event.target as IDBTransaction;
        reject(target.error ?? new Error(`Transaction error: ${event.type}`));
      };
    });
  },

  async countAllNotReadItems(): Promise<number[]> {
    //TODO: Check that READ is defined
    const range = IDBKeyRange.lowerBound(READ, true);
    const allNames = schema.map((db) => db.name);
    const transaction = this.ensureDB().transaction(allNames);
    const promises = allNames.map((schemaName) =>
      this._readRequestPromise(
        transaction.objectStore(schemaName).index("readStatus").count(range),
      ),
    );
    const values = await Promise.all(promises);
    return values;
  },

  async fetchItems(schemaName: schemaType) {
    const transaction = this.ensureDB().transaction([schemaName]);
    const getAllRequest = transaction.objectStore(schemaName).getAll();
    return this._readRequestPromise(getAllRequest);
  },

  async updateAllStatus(schemaName: schemaType, mark: Status): Promise<void> {
    const transaction = this.ensureDB().transaction([schemaName], "readwrite");
    const promise = this._transactionPromise(transaction);
    const objectStore = transaction.objectStore(schemaName);

    //TODO: Make it getAll(toggle(mark)) for efficiency
    const getAllRequest = objectStore.index("readStatus").getAll();
    getAllRequest.onsuccess = () => {
      getAllRequest.result.forEach((item) => {
        objectStore.put({ ...item, readStatus: mark });
      });
    };
    return promise;
  },

  async updateStatus(schemaName: schemaType, mark: Status, id: string) {
    if (id === undefined || id === null) {
      return this.updateAllStatus(schemaName, mark);
    }

    const transaction = this.ensureDB().transaction([schemaName], "readwrite");
    const promise = this._transactionPromise(transaction);
    const objectStore = transaction.objectStore(schemaName);

    const getRequest = objectStore.get(id);
    getRequest.onsuccess = () => {
      objectStore.put({ ...getRequest.result, readStatus: mark });
    };
    return promise;
  },
};
