import {Database} from "./modules/database.js";
const schemas = Object.values(CONFIG);

const storage = window.localStorage;
function getPeriod() {
  const res = storage.getItem("periodInMinutes");
  if (!res) {
    setPeriod(1440);
    return 1440;
  }
  return parseInt(res);
}

function setPeriod(period) {
  storage.setItem("periodInMinutes", period);
}

async function update() {
  await Database.updateAll();
  await updateUI();
}

async function updateBadge() {
  const unreadCounts = await Database.countAllUnreadItems();
  const n_counts = Object.values(unreadCounts);
  if (n_counts.reduce((acc, val) => acc + val, 0) === 0) {
    browser.action.setBadgeText({text: ""});
    return;
  }
  const text = n_counts.map((n) => n>0 ? "!" : "").join("-");
  browser.action.setBadgeText({text});
  browser.action.setBadgeBackgroundColor({color: "red"});
}

async function updateAllStatus(schemaName, mark) {
  console.log(schemaName, mark);
  try {
    await Database.updateAllStatus(schemaName, mark);
    updateUI(schemaName); //Is it ok to not await on this?
  } catch(e) {
    console.error(`Error marking all as read for ${schemaName}: ${e}`);
  }
}

let _init_promise = null;

function initialize() {
  if (_init_promise) { return _init_promise; }
  _init_promise = Database.init()
    .then(async () => {
      const p1 = browser.alarms.get("reparse")
            .then((alarm) => {if (!alarm) { browser.alarms.create("reparse", { periodInMinutes: getPeriod() }); }});
      const p2 = update();
      await Promise.all([p1, p2]);
    })
    .catch((error) => {
      console.error(`Error initializing: ${error}`);
      _init_promise = null;
    });
  return _init_promise;
}

async function getTabs(schemaName) {
  const urls = schemaName? [CONFIG[schemaName].url] : schemas.map((v) => v.url);
  const tabs = await Promise.all(urls.map((url) => browser.tabs.query({url})));
  return tabs.flat();
}

async function updateUI(schemaName) {
  updateBadge();
  //TODO: Can this be made in parallel for all tabs?
  const tabs = await getTabs(schemaName);
  tabs.forEach((tabx) => { browser.tabs.sendMessage(tabx.id, {content: "db Updated"})});
}

async function reset() {
  //TODO: Check for race conditions with updateUI message
  _init_promise = null;
  try {
    await Database.clear();
  } catch (e) {
    console.error(`Error resetting: ${e}`);
  } finally {
    await initialize();
  }
}

browser.alarms.onAlarm.addListener((alarmInfo) => {
    console.log(`Alarm ${alarmInfo.name} fired.`);
    if (alarmInfo.name === "reparse") { update(); }
});

async function openURL(url) {
  const tabs = await browser.tabs.query({url});
  if (tabs.length > 0) {
    browser.tabs.update(tabs[0].id, {active:true});
    browser.windows.update(tabs[0].windowId, {focused: true});
  } else {
    browser.tabs.create({url});
  }
}

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const schemaName = message.schemaName;
  console.log(`Message listened: ${message.content}`);
  initialize()
    .then(() => {
      switch (message.content) {
      case "reset":
        reset()
          .then(() => sendResponse({success: true}));
        break;
      case "update":
        update()
          .then(() => sendResponse({success: true}));
        break;
      case "MarkAll":
        updateAllStatus(schemaName, message.mark)
          .then(() => sendResponse({success: true}));
        break;
      case "openURL":
        schemas.forEach((v) => openURL(v.url));
        sendResponse({success: true});
        break;
      case "setAlarmPeriod":
        setPeriod(message.minutes);
        browser.alarms.clear("reparse")
          .then(() => browser.alarms.create("reparse", { periodInMinutes: message.minutes }))
          .then(() => sendResponse({success: true}));
        break;
      case "getAlarmPeriod":
        sendResponse({alarmPeriod: getPeriod()});
        break;
      case "updateUI":
        console.log("updateUI-listened");
        Database.fetchItems(schemaName)
          .then((items) => {
            sendResponse({items});})
        break;
      case "mark":
        console.log("mark-listened");
        Database.updateStatus(schemaName, message.mark, message.id)
          .then(() => {
            updateBadge();
            sendResponse({success: true});})
        break;
      default:
        throw new Error(`Unknown message received: ${message}`);
      }
    })
    .catch((err) => sendResponse({error: err.message}));
  return true;
});

browser.runtime.onInstalled.addListener(async () => {
  await initialize();
  setPeriod(1440);
});

await initialize();
