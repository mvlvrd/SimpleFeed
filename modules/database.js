import {fetchAndParse} from "../utils.js";

const _dbName = "notebooksDB";
const _dbVersion = 2;

const [UNREAD, READ] = [0, 1];

const schemas = {1: {name:"notebooks", keyOptions:{keyPath: "title"}},
                 2: [{name:"notebooks", keyOptions:{keyPath: "title"}, idx:"readStatus"},
		     {name:"weblog", keyOptions:{keyPath: "updateDate"}, idx:"readStatus"}
		    ]};
const schema = schemas[_dbVersion];

export const Database = {
  _db: undefined,

  async init(dbVersion = _dbVersion) {
    if (this._db) return;

    this._db = await new Promise((resolve, reject) => {
      const request = indexedDB.open(_dbName, dbVersion);
      request.onupgradeneeded = (event) => {
        console.log("Upgrade DB");
        const db = event.target.result;
        schema.forEach(({name, keyOptions, idx}) => {
          db.createObjectStore(name, keyOptions)
            .createIndex(idx, idx, { unique: false });});
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

  async updateAll() {
    Promise.allSettled(schema.map(x => this.update(x.name)));
  },

  async update(schemaName) {
    const items = await fetchAndParse(schemaName);
    const transaction = this._db.transaction([schemaName], "readwrite");
    const promise = new Promise((resolve, reject) => {
      transaction.onerror = (event) => reject(event.error);
      transaction.oncomplete = () => resolve();
    });

    const objectStore = transaction.objectStore(schemaName);
    const getAllRequest = objectStore.getAll();

    const updaters = {
      "notebooks": () => {
        const existingMap = new Map(getAllRequest.result.map(item => [item.title, item]));
        items.forEach(item => {
          const existing = existingMap.get(item.title);
          if (!existing || item.updateDate > existing.updateDate) {
            const readStatus = existing ? existing.readStatus : UNREAD;
            objectStore.put({...item, readStatus});}});},
      "weblog": () => {
        const existingMap = new Map(getAllRequest.result.map(item => [item.updateDate, item]));
        items.forEach(item => {
          const existing = existingMap.get(item.updateDate);
          if (!existing) {
            const readStatus = UNREAD;
            objectStore.put({...item, readStatus});}});}
    }

    getAllRequest.onsuccess = updaters[schemaName];
    return promise;
  },

  _readTransactionPromise(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async countUnreadItems(schemaName) {
    const range = IDBKeyRange.only(UNREAD);
    const transaction = this._db.transaction([schemaName]);
    const countRequest = transaction.objectStore(schemaName).index("readStatus").count(range);
    return this._readTransactionPromise(countRequest);
  },

  async countAllUnreadItems() {
    const promises = Array.from(this._db.objectStoreNames).map(schemaName => this.countUnreadItems(schemaName));
    return Promise.all(promises);
  },

  async fetchItems(schemaName) {
    const transaction = this._db.transaction([schemaName]);
    const getAllRequest = transaction.objectStore(schemaName).getAll();
    return this._readTransactionPromise(getAllRequest);
  },

  async updateAllStatus(schemaName, mark) {
    const transaction = this._db.transaction([schemaName], "readwrite");
    const promise = new Promise((resolve, reject) => {
      transaction.onerror = (event) => reject(event.error);
      transaction.oncomplete = () => resolve();
    });

    const objectStore = transaction.objectStore(schemaName);
    objectStore.openCursor().onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        cursor.update({...cursor.value, readStatus: mark});
        cursor.continue();
      }
    };

    return promise;
  },

  async updateStatus(schemaName, mark, id) {
    if (!id) {return this.updateAllStatus(schemaName, mark);}

    const transaction = this._db.transaction([schemaName], "readwrite");
    const promise = new Promise((resolve, reject) => {
      transaction.onerror = (event) => reject(event.error);
      transaction.oncomplete = () => resolve();
    });

    const objectStore = transaction.objectStore(schemaName);
    const getRequest = objectStore.get(id);
    getRequest.onsuccess = () => {
      objectStore.put({...getRequest.result, readStatus: mark});
    }

    return promise;
  }
}
