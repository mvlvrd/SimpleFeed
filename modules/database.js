import {fetchAndParse} from "../utils.js";

const _dbName = "simpleFeedDB";

function generateSchemaFromConfig() {
  return Object.entries(CONFIG).map(([name, site]) => {
    return {
      name: name,
      keyOptions: { keyPath: site.keyPath },
      idx: "readStatus"
    };
  });
}

const schema = generateSchemaFromConfig();

export const Database = {
  _db: undefined,

  async init(dbVersion = SchemaVersion) {
    if (this._db) return;
    console.log("Initialize DB");
    const request = indexedDB.open(_dbName, dbVersion);
    this._db = await new Promise((resolve, reject) => {
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        //TODO: Check the logic here is robust.
        //Delete deprecated Object Stores
        const newNames = schema.map((x) => x.name);
        const existingNames = db.objectStoreNames;
        const n = existingNames.length;
        for (let i=0; i<n; i++) {
          const existingName = existingNames.item(i);
          if (!newNames.includes(existingName)) {
            db.deleteObjectStore(existingName);
          }
        }
        //Create new Object Stores
        let newExistingNames = db.objectStoreNames;
        schema.forEach(({name, keyOptions, idx}) => {
          if (! newExistingNames.contains(name)) {
            db.createObjectStore(name, keyOptions)
              .createIndex(idx, idx, { unique: false });}
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
    const transaction = this._db.transaction(schemaNames, "readwrite");
    const promise = this._transactionPromise(transaction);
    schemaNames.forEach((name) => transaction.objectStore(name).clear());
    return promise;
  },

  async updateAll() {
    return Promise.allSettled(schema.map(x => this.update(x.name)));
  },

  async update(schemaName) {
    const items = await fetchAndParse(schemaName);

    const transaction = this._db.transaction([schemaName], "readwrite");
    const promise = this._transactionPromise(transaction);
    const objectStore = transaction.objectStore(schemaName);

    const getKey = (item) => item[CONFIG[schemaName].keyPath];
    const getUpdateStatus = CONFIG[schemaName].getUpdateStatus;

    const getAllRequest = objectStore.getAll();
    getAllRequest.onsuccess = () => {
      const existingMap = new Map(getAllRequest.result.map(item => [getKey(item), item]));
      items.forEach(item => { const {needsUpdate, readStatus} = getUpdateStatus(item, existingMap);
                              if (needsUpdate) { objectStore.put({...item, readStatus: readStatus}) }})
    };
    getAllRequest.onerror = () => console.error(getAllRequest.error);
    return promise;
  },

  _readRequestPromise(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  _transactionPromise(transaction) {
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {resolve()};
      transaction.onerror = (event) => {reject(event.error)};
    });
  },

  async countAllNotReadItems() {
    //TODO: Check that READ is defined
    const range = IDBKeyRange.lowerBound(READ, true);
    const allNames = schema.map(db => db.name);
    const transaction = this._db.transaction(allNames);
    const promises = allNames.map(schemaName =>
      this._readRequestPromise(transaction.objectStore(schemaName).index("readStatus").count(range)));
    const values = await Promise.all(promises);
    return Object.fromEntries(values.map((val, i) => [allNames[i], val]));
  },

  async fetchItems(schemaName) {
    const transaction = this._db.transaction([schemaName]);
    const getAllRequest = transaction.objectStore(schemaName).getAll();
    return this._readRequestPromise(getAllRequest);
  },

  async updateAllStatus(schemaName, mark) {
    if (!schemaName) {
      const promises = schema.map((x) => this.updateAllStatus(x.name, mark));
      return Promise.all(promises);
    }

    const transaction = this._db.transaction([schemaName], "readwrite");
    const promise = this._transactionPromise(transaction);
    const objectStore = transaction.objectStore(schemaName);

    //TODO: Make it getAll(toggle(mark)) for efficiency
    const getAllRequest = objectStore.index("readStatus").getAll();
    getAllRequest.onsuccess = () => {
      getAllRequest.result.forEach(item => {
        objectStore.put({...item, readStatus: mark});
      });
    };
    return promise;
  },

  async updateStatus(schemaName, mark, id) {
    if (!id) {return this.updateAllStatus(schemaName, mark);}

    const transaction = this._db.transaction([schemaName], "readwrite");
    const promise = this._transactionPromise(transaction);
    const objectStore = transaction.objectStore(schemaName);

    const getRequest = objectStore.get(id);
    getRequest.onsuccess = () => {
      objectStore.put({...getRequest.result, readStatus: mark});
    };
    return promise;
  }
}
