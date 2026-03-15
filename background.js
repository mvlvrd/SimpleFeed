import {Database} from "./modules/database.js";

async function update() {
    await Database.updateAll();
    await updateBadge();
}

async function updateBadge() {
    const n_unread = await Database.countAllUnreadItems();
    if (n_unread.reduce((acc, val) => acc + val, 0) == 0) {
        browser.action.setBadgeText({text: ""});
        return;
    }
    const text = n_unread.map(n => n>0 ? n.toString() : "").join("/");
    browser.action.setBadgeText({text: text});
    browser.action.setBadgeBackgroundColor({color: "red"});
}

let _init_promise = null;

function initialize() {
    if (_init_promise) return _init_promise;
    _init_promise = Database.init()
    .then(async () => {
        const alarm = await browser.alarms.get("reparse");
        if (!alarm) browser.alarms.create("reparse", { periodInMinutes: 1440 });
        await update();})
    .catch(error => {
        console.error(`Error initialziing: ${error}`);
        _init_promise = null;
    });
    return _init_promise;
}

browser.alarms.onAlarm.addListener((alarmInfo) => {
    console.log(`Alarm ${alarmInfo.name} fired.`);
    if (alarmInfo.name === "reparse") { update(); }
});

async function clickListener(url) {
    await initialize();
    const tabs = await browser.tabs.query({url: url});
    if (tabs.length > 0) {
        browser.tabs.update(tabs[0].id, {active:true});
        browser.windows.update(tabs[0].windowId, {focused: true});
    } else {
        browser.tabs.create({url: url});
    }
}

browser.action.onClicked.addListener(async () => {
    console.log("click-listened");
    //TODO: Make it conditional on zero unread counts.
    Object.values(CONFIG).forEach(
        obj => clickListener(obj.url).catch(err => console.error(err)));
});

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const schemaName = (new URL(sender.url)).pathname.replace(/^\/+|\/+$/g, "");
    switch (message.content) {
    case "updateUI":
    console.log("updateUI-listened");
        Database.fetchItems(schemaName)
            .then((items) => {
                updateBadge();
                sendResponse(items);})
            .catch(err => sendResponse({error: err.message}));
        break;
    case "mark":
        console.log("mark-listened");
        Database.updateStatus(schemaName, message.mark, message.id)
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
    if (details.reason === "install") {
    await initialize();
    }
});

browser.runtime.onStartup.addListener(async () => {
    await initialize()
});

await initialize();
