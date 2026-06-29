import { CONFIGS, SchemaNames } from "./config.ts";
import { Database } from "./modules/database.ts";
const schemas = Object.values(CONFIGS);

const defaultPeriod = "1440";

const storage = window.localStorage;
/** @return {number}
 **/
function getPeriod() {
  const res = storage.getItem("periodInMinutes");
  if (!res) {
    setPeriod(defaultPeriod);
    return parseInt(defaultPeriod);
  }
  return parseInt(res);
}

/** @param {string} period
 **/
function setPeriod(period) {
  storage.setItem("periodInMinutes", period);
}

async function update() {
  await Database.updateAll();
  await updateUI();
}

async function updateBadge() {
  const n_counts = await Database.countAllNotReadItems();
  if (n_counts.reduce((acc, val) => acc + val, 0) === 0) {
    browser.action.setBadgeText({ text: "" });
    return;
  }
  const text = n_counts.map((n) => (n > 0 ? "!" : "")).join("-");
  browser.action.setBadgeText({ text });
  browser.action.setBadgeBackgroundColor({ color: "red" });
}

/** @param {import('./config.ts').Status} mark
    @return {Promise<void>}
 **/
async function updateAllSchemasStatus(mark) {
  await Promise.all(SchemaNames.map((x) => updateAllStatus(x, mark)));
  return;
}

/** @param {import('./config.ts').schemaType} schemaName
    @param {import('./config.ts').Status} mark
    @return {Promise<void>}
 **/
async function updateAllStatus(schemaName, mark) {
  try {
    await Database.updateAllStatus(schemaName, mark);
    await updateUI(schemaName);
  } catch (e) {
    console.error(`Error marking all as read for ${schemaName}: ${e}`);
  }
}

/** @type {Promise<void> | null} */
let _init_promise = null;

function initialize() {
  if (_init_promise) {
    return _init_promise;
  }
  _init_promise = Database.init()
    .then(async () => {
      const p1 = browser.alarms.get("reparse").then((alarm) => {
        if (!alarm) {
          browser.alarms.create("reparse", { periodInMinutes: getPeriod() });
        }
      });
      const p2 = update();
      await Promise.all([p1, p2]);
    })
    .catch((error) => {
      console.error(`Error initializing: ${error}`);
      _init_promise = null;
    });
  return _init_promise;
}

/** @param {import('./config.ts').schemaType} [schemaName] */
async function getTabs(schemaName) {
  const urls = schemaName
    ? [CONFIGS[schemaName].url]
    : schemas.map((v) => v.url);
  const tabs = await Promise.all(
    urls.map((url) => browser.tabs.query({ url })),
  );
  return tabs.flat();
}

/** @param {import('./config.ts').schemaType} [schemaName] */
async function updateUI(schemaName) {
  updateBadge();
  //TODO: Can this be made in parallel for all tabs?
  const tabs = await getTabs(schemaName);
  tabs.forEach(
    (_tab) =>
      _tab.id !== undefined &&
      browser.tabs.sendMessage(_tab.id, { content: "db Updated" }),
  );
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
  if (alarmInfo.name === "reparse") {
    update();
  } //TODO: Deal with Promise rejection case.
});

/** @param {string} url
 **/
async function openURL(url) {
  const tabs = await browser.tabs.query({ url });
  if (tabs.length === 0) {
    browser.tabs.create({ url });
    return;
  }
  if (tabs[0].id !== undefined && tabs[0].windowId !== undefined) {
    browser.tabs.update(tabs[0].id, { active: true });
    browser.windows.update(tabs[0].windowId, { focused: true });
  }
}

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const schemaName = message.schemaName;
  console.log(`Message listened: ${message.content}`);
  initialize()
    .then(() => {
      switch (message.content) {
        case "reset":
          reset().then(() => sendResponse({ success: true }));
          break;
        case "update":
          update().then(() => sendResponse({ success: true }));
          break;
        case "MarkAll":
          if (schemaName === "") {
            updateAllSchemasStatus(message.mark).then(() =>
              sendResponse({ success: true }),
            );
          } else {
            updateAllStatus(schemaName, message.mark).then(() =>
              sendResponse({ success: true }),
            );
          }
          break;
        case "openURL":
          schemas.forEach((v) => openURL(v.url));
          sendResponse({ success: true });
          break;
        case "setAlarmPeriod":
          setPeriod(message.minutes);
          browser.alarms
            .clear("reparse")
            .then(() =>
              browser.alarms.create("reparse", {
                periodInMinutes: message.minutes,
              }),
            )
            .then(() => sendResponse({ success: true }));
          break;
        case "getAlarmPeriod":
          sendResponse({ alarmPeriod: getPeriod() });
          break;
        case "updateFrontEnd":
          console.log("updateFrontEnd-listened");
          Database.fetchItems(schemaName).then((items) => {
            sendResponse({ items });
          });
          break;
        case "mark":
          console.log("mark-listened");
          Database.updateStatus(schemaName, message.mark, message.key).then(
            () => {
              updateBadge();
              sendResponse({ success: true });
            },
          );
          break;
        default:
          throw new Error(`Unknown message received: ${message}`);
      }
    })
    .catch((err) => sendResponse({ error: err.message }));
  return true;
});

browser.runtime.onInstalled.addListener(async () => {
  await initialize();
  setPeriod(defaultPeriod);
});

browser.runtime.onStartup.addListener(async () => {
  // Reset the promise so initialize runs again
  _init_promise = null;
  await initialize();
});
await initialize();
