const schemaName = window.location.pathname.replace(/^\/+|\/+$/g, "");
const {dtListSelector, elementSelector, classNameCSS, getKey, putToolBar} = CONFIG[schemaName];
const dtArray = Array.from(document.querySelectorAll(dtListSelector));

const toggle = (x) => 1 - x;

const newElement = (element, obj) => Object.assign(document.createElement(element), obj);

function editPreamble() {
  if (document.getElementById("toolBar")) return;
  const toolBar = newElement("div", { id: "toolBar", className: "toolbar"});
  const markReadBTN = newElement("button", {
    className: "btn mark-all-read-btn",
    id: "markAllReadBtn",
    innerHTML: "↺ Mark all as read"
  });
  const markUnreadBTN = newElement("button", {
    className: "btn mark-all-unRead-btn",
    id: "markAllUnreadBtn",
    innerHTML: "↺ Mark all as unread"
  });
  toolBar.append(markReadBTN, markUnreadBTN);

  putToolBar(toolBar);
  document.getElementById("markAllReadBtn").addEventListener("click", (event) => { event.stopPropagation(); markRead(READ) });
  document.getElementById("markAllUnreadBtn").addEventListener("click", (event) => { event.stopPropagation(); markRead(UNREAD) });
}

function renderItemReadPhase(dt, mark) {
  const keyElement = dt.querySelector(elementSelector);
  const key = keyElement.textContent;
  if (!dt.id) {dt.id = key};
  const isRead = (mark === undefined) ? ItemMap.get(key) : mark;
  const btnId = `btn-${key}`;
  const btn = document.getElementById(btnId);
  return {dt, keyElement, isRead, btnId, btn};
}

function renderItemWritePhase({dt, keyElement, isRead, btnId, btn}) {
  keyElement.className = classNameCSS(isRead ? " bold-read" : "");
  if (!btn) {
    btn = newElement("button", {id: btnId});
    dt.append(btn);
  }
  btn.className = isRead ? "toggle-btn" : "toggle-btn read";
  btn.innerHTML = isRead ? "◯" : "✔"; //isRead? "◯ Mark as unread": "✔ Mark as read";
}

function renderItems(dts, mark) {
  const readRes = [];
  for (const dt of dts) {
    readRes.push(renderItemReadPhase(dt, mark));
  };
  for (const obj of readRes) { renderItemWritePhase(obj) };
}

function markRead(mark, dt) {
  const dts = dt? new Array(dt) : dtArray;
  const id = dt? dt.querySelector(elementSelector).textContent : undefined;
  renderItems(dts, mark);
  browser.runtime.sendMessage({content: "mark", mark:mark, id:id})
    .then(() => { dts.forEach(dt => {ItemMap.set(dt.id, mark);}) })
    .catch(error => {
      console.error(`Error marking: ${error}`);
      renderItems(dts, toggle(mark));
    })
}

async function refreshData() {
  const message = await browser.runtime.sendMessage({content: "updateUI"});
  if (message.error) {console.error(`Error refreshing UI ${message.error}`);};
  return new Map(message.map(item => [getKey(item), item.readStatus]));
}

let ItemMap;
(async () => {ItemMap = await refreshData();
              renderItems(dtArray);})();
editPreamble();

document.body.addEventListener("click", (event) => {
  const button = event.target.closest("button.toggle-btn, button.read");
  const key = button?.id.substring(4);
  if (!key || !ItemMap) return;
  event.stopPropagation();
  const newStatus = toggle(ItemMap.get(key));
  markRead(newStatus, document.getElementById(key));
});
