const schemaName = window.location.pathname.replace(/^\/+|\/+$/g, "");
const {dtListSelector, elementSelector, classNameCSS, getKey, putToolBar} = CONFIG[schemaName];
const dtList = document.querySelectorAll(dtListSelector);

const [UNREAD, READ] = [0, 1];
const toggle = x => 1 - x;

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

//TODO: Make it more efficient when looping for all items.
function renderItem(dt, mark) {
  const keyElement = dt.querySelector(elementSelector);
  const key = keyElement.textContent;
  if (!dt.id) {dt.id = key};
  const isRead = (mark === undefined) ? ItemMap.get(key) : mark;

  const keyBoldClass = isRead ? " bold-read" : "";
  const toggleBtnClass = isRead ? "toggle-btn" : "toggle-btn read";
  const toggleBtnContent = isRead ? "◯" : "✔"; //isRead? "◯ Mark as unread": "✔ Mark as read";

  keyElement.className = classNameCSS(keyBoldClass);

  const btnID = `btn-${key}`;
  let btn = document.getElementById(btnID);
  if (!btn) {
    btn = newElement("button", {id: btnID});
    dt.append(btn);
  }
  btn.className = toggleBtnClass;
  btn.innerHTML = toggleBtnContent;
}

function markRead(mark, dt) {
  const dts = dt? new Array(dt) : dtList;
  const id = dt? dt.querySelector(elementSelector).textContent : undefined;
  dts.forEach(dt => renderItem(dt, mark)); // This could be made async
  browser.runtime.sendMessage({content: "mark", mark:mark, id:id})
    .then(() => { dts.forEach(dt => {ItemMap.set(dt.id, mark);}) })
    .catch(error => {
      console.error(`Error marking: ${error}`);
      dts.forEach(dt => renderItem(dt, toggle(mark)));});
}

async function refreshData() {
  const message = await browser.runtime.sendMessage({content: "updateUI"});
  if (message.error) throw new Error(message.error);
  return new Map(message.map(item => [getKey(item), item.readStatus]));
}

let ItemMap;
(async () => {ItemMap = await refreshData();
              dtList.forEach(dt => renderItem(dt));})();
editPreamble();

document.body.addEventListener("click", (event) => {
  const button = event.target.closest("button.toggle-btn, button.read");
  const key = button?.id.substring(4);
  if (!key || !ItemMap) return;
  event.stopPropagation();
  const newStatus = toggle(ItemMap.get(key));
  markRead(newStatus, document.getElementById(key));
});
