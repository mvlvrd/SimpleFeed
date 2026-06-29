import { toggle, getConfig, READ, UNREAD, UPDATED } from "../config.ts";

const {
  schemaName,
  config: { elListSelector, getter, keyPath },
} = getConfig(window.location);

/** @type {Map<string, HTMLButtonElement>} */
let key2btnMap;
/** @type {Map<string, import("../config.ts").Status>} */
let ItemMap;

/** @param {string} key
 **/
function renderItem(key) {
  const readStatus = ItemMap.get(key);
  const btn = key2btnMap.get(key);
  if (readStatus === undefined || !btn) return;
  switch (readStatus) {
    case READ:
      btn.className = "toggle-btn read";
      btn.innerHTML = "✗";
      break;
    case UNREAD:
      btn.className = "toggle-btn unread";
      btn.innerHTML = "✔";
      break;
    case UPDATED:
      btn.className = "toggle-btn updated";
      btn.innerHTML = "✔";
      break;
  }
}

function renderItems() {
  for (const key of key2btnMap.keys()) {
    renderItem(key);
  }
}

/** @returns {Promise<void>}
 **/
async function refresh() {
  const message =
    /** @type {{ items: import('../config.ts').DBItem<import('../config.ts').schemaType>[], error?: string }} */ (
      await browser.runtime.sendMessage({
        content: "updateFrontEnd",
        schemaName,
      })
    );
  if (message.error) {
    console.error(`Error in "updateFrontEnd" ${message.error}`);
    return;
  }
  ItemMap = new Map(
    message.items.map((item) => [item[keyPath], item.readStatus]),
  );
}

(async () => {
  await refresh();
  const elArray = Array.from(
    /** @type {NodeListOf<HTMLElement>} */ (
      document.querySelectorAll(elListSelector)
    ),
  );
  key2btnMap = new Map(
    elArray.map((el) => {
      const key = String(getter(el)[keyPath]);
      const btn = Object.assign(document.createElement("button"), {
        className: "toggle-btn",
      });
      btn.dataset.key = key;
      el.prepend(btn);
      return [key, btn];
    }),
  );
  renderItems();

  document.body.addEventListener("click", (event) => {
    //TODO: Check for possible race condition with rollbacks over concurrent clicks.
    const closest =
      event.target instanceof HTMLElement &&
      event.target.closest("button.toggle-btn");
    if (!(closest instanceof HTMLElement)) return;
    const key = closest.dataset.key;
    if (!key) return;
    event.stopPropagation();

    const oldMark = ItemMap.get(key);
    if (oldMark === undefined) {
      console.error(`Key: ${key} not found in ItemMap.`);
      return;
    }
    const mark = toggle(oldMark);
    ItemMap.set(key, mark);
    renderItem(key);
    browser.runtime
      .sendMessage({ content: "mark", schemaName, mark, key })
      .catch((error) => {
        ItemMap.set(key, oldMark);
        renderItem(key);
        console.error(`Error marking: ${error}`);
      });
  });

  browser.runtime.onMessage.addListener((message) => {
    if (message.content === "db Updated") {
      refresh().then(renderItems).catch(console.error);
    }
  });
})();
