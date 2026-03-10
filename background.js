import {Database} from "./modules/database.js";
import {TARGET_URL} from "./utils.js";

async function update() {
    await Database.update();
    await updateBadge();
}

async function updateBadge() {
    const n_unread = await Database.countUnreadItems();
    browser.action.setBadgeText({text: n_unread.toString()});
}

let _init_promise = null;

function initialize() {
    if (_init_promise) return _init_promise;
    _init_promise = Database.init()
	.then(async () => {
	    const alarm = await browser.alarms.get('reparse');
	    if (!alarm) browser.alarms.create('reparse', { periodInMinutes: 1440 });
	    await update();})
	.catch (error => {
	    console.error(error);
	    _init_promise = null;
	});
    return _init_promise;
}

browser.alarms.onAlarm.addListener((alarmInfo) => {
    console.log(`Alarm ${alarmInfo.name} fired.`);
    if (alarmInfo.name === 'reparse') { update(); }
});

browser.action.onClicked.addListener(async () => {
    console.log(`Status: ${_init_promise}`);
    await initialize();
    const tabs = await browser.tabs.query({url: TARGET_URL});
    if (tabs.length > 0) {
	browser.tabs.update(tabs[0].id, {active:true});
	browser.windows.update(tabs[0].windowId, {focused: true});
    } else {
	browser.tabs.create({url: TARGET_URL});
    }
});

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.content) {
    case "updateUI":
	console.log("updateUI-listened");
	Database.fetchItems()
	    .then((items) => {
		updateBadge();
		sendResponse(items);})
	    .catch(err => sendResponse({error: err.message}));
	break;
    case "mark":
	console.log("mark-listened");
	Database.updateStatus(message.mark, message.id)
	    .then(() => {
		updateBadge();
		sendResponse({success: true});})
	    .catch(err => sendResponse({error: err.message}));
	break;
    default:
	throw new Error(`Unknown message received: ${message}`);
    }
    return true;
});

browser.runtime.onInstalled.addListener(async (details) => {
    //TODO: Improve this.
    if (details.reason === 'install') {
	await initialize();
    }
});

browser.runtime.onStartup.addListener(async () => {
    await initialize()
});
