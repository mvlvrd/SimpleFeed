import {fetchAndParse} from "../utils.js";

const _dbName = "notebooksDB";
const _dbVersion = 1;

const [UNREAD, READ] = [0, 1];

const schemas = {1: {name:"notebooks", keyOptions:{keyPath: 'title'}}}
const schema = schemas[_dbVersion];

export const Database = {
    _db: undefined,

    async init(dbVersion = _dbVersion) {
	if (this._db) return this._db;

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
	transaction.onerror = (event) => console.error(`Update failed with error:${event.error}`);

	const objectStore = transaction.objectStore(schema.name);

	const getAllRequest = objectStore.getAll();
	const existingItems = await new Promise((resolve, reject) => {
	    getAllRequest.onsuccess = () => resolve(getAllRequest.result);
	    getAllRequest.onerror = () => reject(getAllRequest.error);		
	});

	const existingMap = new Map(existingItems.map(item => [item.title, item]));
	const updateItem = ({title, updateDate, readStatus}) => {
	    const existingItem = existingMap.get(title);
	    return !existingItem || updateDate > existingItem.updateDate;
	};

	await Promise.all(items.map(async (item) => {
            const existing = existingMap.get(item.id);
            if (updateItem(item)) {
                const readStatus = existing ? existing.readStatus : UNREAD;
                return new Promise((resolve, reject) => {
                    const putRequest = objectStore.put({...item, readStatus});
                    putRequest.onsuccess = () => {resolve()};
                    putRequest.onerror = () => {console.log(item); reject(putRequest.error)};
                });
            }
        }));
    },
    
    async countUnreadItems() {
	const range = IDBKeyRange.only(UNREAD);
	const index = this._db.transaction([schema.name]).objectStore(schema.name).index('readStatus');
	return new Promise((resolve, reject) => {
	    const countRequest = index.count(range);
	    countRequest.onsuccess = () => resolve(countRequest.result);
	    countRequest.onerror = () => reject(countRequest.error);
	});
    },

    async fetchItems() {
	console.log("fetching");
	const getAllRequest = this._db.transaction([schema.name]).objectStore(schema.name).getAll();
	return new Promise((resolve, reject) => {
	    getAllRequest.onsuccess = () => resolve(getAllRequest.result);
	    getAllRequest.onerror = () => reject(getAllRequest.error);
	});
    },

    async updateAllStatus(mark) {
	const transaction = this._db.transaction([schema.name], "readwrite");
	transaction.onerror = (event) => console.error(`Update All Status failed with error:${event.error}`);
	const objectStore = transaction.objectStore(schema.name);
	objectStore.openCursor().onsuccess = (event) => {
	    const cursor = event.target.result;
	    if (cursor) {
		const item = cursor.value;
		const request = cursor.update({...item, readStatus: mark});
		cursor.continue();
	    }};
    },

    async updateStatus(mark, id) {
	if (!id) {
	    await this.updateAllStatus(mark);
	    return;
	}

	const transaction = this._db.transaction([schema.name], "readwrite");
	transaction.onerror = (event) => console.error(`Update Status failed with error:${event.error}`);
	const objectStore = transaction.objectStore(schema.name);

	const getRequest = objectStore.get(id);
	getRequest.onsuccess = () => {
	    const item = getRequest.result;
	    const putRequest = objectStore.put({...item, readStatus: mark});
	}
    }
}
