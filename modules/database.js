import {fetchAndParse} from "../utils.js";

const _dbName = "notebooksDB";
const _dbVersion = 1;

const [UNREAD, READ] = [0, 1];

const schemas = {1: {name:"notebooks", keyOptions:{keyPath: 'title'}}}
const schema = schemas[_dbVersion];

export const Database = {
    _db: undefined,

    async init(dbVersion = _dbVersion) {
	if (this._db) return;

	this._db = await new Promise((resolve, reject) => {
	    const request = indexedDB.open(_dbName, dbVersion);

	    request.onupgradeneeded = (event) => {
		console.log("upgrade");
		const db = event.target.result;
		const store = db.createObjectStore(schema.name, schema.keyOptions);
		store.createIndex('readStatus', 'readStatus', { unique: false });
	    };

	    request.onerror = () => {
		console.error(`Error initializing IndexedDB: ${request.error}`);
		reject(request.error);
	    };

	    request.onsuccess = () => {
		resolve(request.result);
		console.log("DB opened");
	    };
	})},

    async update() {
	const items = await fetchAndParse();

	const transaction = this._db.transaction([schema.name], "readwrite");
	const promise = new Promise((resolve, reject) => {
	    transaction.onerror = (event) => reject(event.error);
	    transaction.oncomplete = () => resolve();
	});

	const objectStore = transaction.objectStore(schema.name);
	const getAllRequest = objectStore.getAll();
	getAllRequest.onsuccess = () => {
	    const existingMap = new Map(getAllRequest.result.map(item => [item.title, item]));
	    items.forEach(item => {
		const existing = existingMap.get(item.title);
		if (!existing || item.updateDate > existing.updateDate) {
                    const readStatus = existing ? existing.readStatus : UNREAD;
                    const putRequest = objectStore.put({...item, readStatus});
		}});
	}
	return promise;
    },

    _readTransactionPromise(request) {
	return new Promise((resolve, reject) => {
	    request.onsuccess = () => resolve(request.result);
	    request.onerror = () => reject(request.error);
	});
    },

    async countUnreadItems() {
	const range = IDBKeyRange.only(UNREAD);
	const transaction = this._db.transaction([schema.name]);
	const countRequest = transaction.objectStore(schema.name).index('readStatus').count(range);
	return this._readTransactionPromise(countRequest);
    },

    async fetchItems() {
	const transaction = this._db.transaction([schema.name]);
	const getAllRequest = transaction.objectStore(schema.name).getAll();
	return this._readTransactionPromise(getAllRequest);
    },

    async updateAllStatus(mark) {
	const transaction = this._db.transaction([schema.name], "readwrite");
	const promise = new Promise((resolve, reject) => {
	    transaction.onerror = (event) => reject(event.error);
	    transaction.oncomplete = () => resolve();
	});

	const objectStore = transaction.objectStore(schema.name);
	objectStore.openCursor().onsuccess = (event) => {
	    const cursor = event.target.result;
	    if (cursor) {
		cursor.update({...cursor.value, readStatus: mark});
		cursor.continue();
	    }
	};

	return promise;
    },

    async updateStatus(mark, id) {
	if (!id) return this.updateAllStatus(mark);

	const transaction = this._db.transaction([schema.name], "readwrite");
	const promise = new Promise((resolve, reject) => {
	    transaction.onerror = (event) => reject(event.error);
	    transaction.oncomplete = () => resolve();
	});

	const objectStore = transaction.objectStore(schema.name);
	const getRequest = objectStore.get(id);
	getRequest.onsuccess = (event) => objectStore.put({...getRequest.result, readStatus: mark});

	return promise;
    }
}
