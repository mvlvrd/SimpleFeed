const schemaName = getSchema(window.location);
const {elListSelector, getter, keyPath} = CONFIG[schemaName];

const getKeyFromEl = (el) => getter(el)[keyPath];

let key2btnMap;
let ItemMap;

function renderItem(key, mark) {
  const readStatus = (mark === undefined) ? ItemMap.get(key) : mark;
  const btn = key2btnMap.get(key);

  switch (readStatus) {
  case (READ):
    btn.className = "toggle-btn read";
    btn.innerHTML = "✗";
    break;
  case (UNREAD):
    btn.className = "toggle-btn unread";
    btn.innerHTML = "✔";
    break;
  case (UPDATED):
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

async function refresh() {
  const message = await browser.runtime.sendMessage({content: "updateFrontEnd", schemaName});
  if (message.error) {
    console.error(`Error in "updateFrontEnd" ${message.error}`);
    return;
  }
  ItemMap = new Map(message.items.map(item => [item[keyPath], item.readStatus]));
}

(async () => {
  await refresh();
  const elArray = Array.from(document.querySelectorAll(elListSelector));
  key2btnMap = new Map(elArray.map((el) => {
    const key = getKeyFromEl(el);
    const btnId = `btn-${key}`;
    const btn = Object.assign(document.createElement("button"), {id: btnId});
    el.prepend(btn);
    return [key, btn];
  }));
  renderItems();

  document.body.addEventListener("click", (event) => {
    const button = event.target.closest("button.toggle-btn");
    const key = button?.id.substring(4);
    if (!key) return;
    event.stopPropagation();
    const mark = toggle(ItemMap.get(key));

    //TODO: Check for possible race condition with rollbacks over concurrent clicks.
    renderItem(key, mark);
    browser.runtime.sendMessage({content: "mark", schemaName, mark, key})
      .then(() => {
        ItemMap.set(key, mark);
      })
      .catch(error => {
        console.error(`Error marking: ${error}`);
        renderItem(key, toggle(mark));
      })
  });

  browser.runtime.onMessage.addListener((message) => {
    if (message.content === "db Updated") {
      refresh().then(() => {renderItems();})
    }
  });

})();
