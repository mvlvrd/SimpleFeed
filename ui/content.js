const schemaName = window.location.pathname.replace(/^\/+|\/+$/g, "");
const {dtListSelector, elementSelector, classNameCSS, getKey} = CONFIG[schemaName];
const dtArray = Array.from(document.querySelectorAll(dtListSelector));

const newElement = (element, obj) => Object.assign(document.createElement(element), obj);

function renderItemReadPhase(dt, mark) {
  const keyElement = dt.querySelector(elementSelector);
  const key = keyElement.textContent;
  if (!dt.id) {dt.id = key;}
  const isRead = (mark === undefined) ? ItemMap.get(key) : mark;
  const btnId = `btn-${key}`;
  const btn = document.getElementById(btnId);
  return {dt, keyElement, isRead, btnId, btn};
}

function renderItemWritePhase({dt, keyElement, isRead, btnId, btn}) {
  keyElement.className = classNameCSS(isRead ? " bold-read" : "");
  if (!btn) {
    btn = newElement("button", {id: btnId});
    dt.prepend(btn);
  }
  btn.className = isRead ? "toggle-btn" : "toggle-btn read";
  btn.innerHTML = isRead ? "◯" : "✔"; //isRead? "◯ Mark as unread": "✔ Mark as read";
}

function renderItems(dts, mark) {
  const readRes = [];
  for (const dt of dts) {
    readRes.push(renderItemReadPhase(dt, mark));
  }
  for (const obj of readRes) { renderItemWritePhase(obj); }
}

function markRead(mark, dt) {
  //TODO: Check for possible race condition with rollbacks over concurrent clicks.
  const dts = dt? [dt] : dtArray;
  const id = dt? dt.querySelector(elementSelector).textContent : undefined;
  renderItems(dts, mark);
  browser.runtime.sendMessage({content: "mark", schemaName, mark, id})
    .then(() => { dts.forEach(dt => {ItemMap.set(dt.id, mark);}) })
    .catch(error => {
      console.error(`Error marking: ${error}`);
      renderItems(dts, toggle(mark));
    })
}

let ItemMap;

async function refreshAndRender() {
  const message = await browser.runtime.sendMessage({content: "updateUI", schemaName});
  if (message.error) {
    console.error(`Error refreshing UI ${message.error}`);
    return;
  }
  ItemMap = new Map(message.items.map(item => [getKey(item), item.readStatus]));
  renderItems(dtArray);
}

(async () => {
  await refreshAndRender();
})();
 
document.body.addEventListener("click", (event) => {
  const button = event.target.closest("button.toggle-btn, button.read");
  const key = button?.id.substring(4);
  if (!key || !ItemMap) return;
  event.stopPropagation();
  const newStatus = toggle(ItemMap.get(key));
  markRead(newStatus, document.getElementById(key));
});

browser.runtime.onMessage.addListener((message) => {
  if (message.content === "db Updated") {
    refreshAndRender();
  }
});
