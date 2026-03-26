import {Database} from "./modules/database.js";

async function update() {
  await Database.updateAll();
  await updateBadge();
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

let _init_promise = null;

function initialize() {
  if (_init_promise) { return _init_promise; }
  _init_promise = Database.init()
    .then(async () => {
      const p1 = browser.alarms.get("reparse")
          .then((alarm) => {if (!alarm) { browser.alarms.create("reparse", { periodInMinutes: 1440 }); }});
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
  const urls = schemaName? [CONFIG[schemaName].url] : Object.values(CONFIG).map((v) => v.url);
  const tabs = await Promise.all(urls.map((url) => browser.tabs.query({url})));
  return tabs.flat();
}

async function updateUI(schemaName) {
  updateBadge();
  //TODO: Can this be made in parallel for all tabs?
  const tabs = await getTabs(schemaName);
  tabs.forEach((tabx) => { browser.tabs.sendMessage(tabx.id, {content: "db Updated"}); });
}

async function reset() {
  //TODO: Check for race conditions with updateUI message
  _init_promise = null;
  try {
    await Database.clear();
    updateUI();
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
  await initialize();
  const tabs = await browser.tabs.query({url});
  if (tabs.length > 0) {
    browser.tabs.update(tabs[0].id, {active:true});
    browser.windows.update(tabs[0].windowId, {focused: true});
  } else {
    browser.tabs.create({url});
  }
}

browser.action.onClicked.addListener(async () => {
  console.log("click-listened");
  await initialize();
  Object.values(CONFIG)
    .forEach((v) => openURL(v.url).catch((e) => console.error(`Error opening URL: ${e}`)));
});

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const schemaName = (new URL(sender.url)).pathname.replace(/^\/+|\/+$/g, "");
  initialize()
    .then(() => {
      switch (message.content) {
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
  browser.menus.create({
    id: "contextReset",
    title: "Reset",
    contexts: ["action"]
  });

  const schemaNames = Object.keys(CONFIG);
  schemaNames.forEach((schemaName) => {
    browser.menus.create({
      id: `Mark-${schemaName}`,
      title: `Mark ${schemaName}`,
      type: "separator",
      contexts: ["action"]
    });
    browser.menus.create({
      id: `MarkRead-${schemaName}`,
      parentId: `Mark-${schemaName}`,
      title: `Mark ${schemaName} as read`,
      contexts: ["action"]
    });
    browser.menus.create({
      id: `MarkUnread-${schemaName}`,
      parentId: `Mark-${schemaName}`,
      title: `Mark ${schemaName} as unread`,
      contexts: ["action"]
    });
  });
  
  async function updateAllStatus(schemaName, mark) {
    try {
      await Database.updateAllStatus(schemaName, mark);
      updateUI(schemaName);
    } catch(e) {
      console.error(`Error marking all as read for ${schemaName}: ${e}`);
    }
  }

  function contextMenuActions({menuItemId}) {
    const [action, schemaName] = menuItemId.split("-");
    switch (action) {
    case "Mark":
      return;
      break;
    case "contextReset":
      console.log("Reset");
      reset();
      break;
    case "MarkRead":
      console.log("Mark all read");
      updateAllStatus(schemaName, READ);
      break;
    case "MarkUnread":
      console.log("Mark all unread");
      updateAllStatus(schemaName, UNREAD);
      break;
    default:
      throw new Error(`Unknown context menu Item ID: ${menuItemId}`);
    }
  }

  await initialize();
  await update();

  browser.menus.onClicked.addListener((info) => {
    console.log("Menu click listened");
    contextMenuActions(info);})
});

browser.runtime.onStartup.addListener(async () => {
  await initialize();
  await update();
});
