let ItemMap = undefined;
const dtList = document.querySelectorAll("dt");

const [UNREAD, READ] = [0, 1];
const toggle = x => 1 - x;

const dateOptions = {year:"numeric", month:"2-digit", day:"2-digit"};

const newElement = (elmnt, obj) => Object.assign(document.createElement(elmnt), obj);

const markReadBTN = newElement('button', {
    className: "btn mark-all-read-btn",
    id: "markAllReadBtn",
    innerHTML: "↺ Mark all as read"
});

const markUnreadBTN = newElement('button', {
    className: "btn mark-all-unRead-btn",
    id: "markAllUnreadBtn",
    innerHTML: "↺ Mark all as unread"
});

const toolBar = newElement('center', { id: 'toolBar', className: 'toolbar'});

function editPreamble() {
    const div = document.querySelector("body > div.text > div");
    toolBar.append(markReadBTN, markUnreadBTN);
    div.append(toolBar);
    document.getElementById('markAllReadBtn').addEventListener('click', (event) => { event.stopPropagation(); markRead(READ) });
    document.getElementById('markAllUnreadBtn').addEventListener('click', (event) => { event.stopPropagation(); markRead(UNREAD) });
}

function renderItem(dt, mark) {
    const titleElement = dt.querySelector('a');
    const title = titleElement.textContent;
    dt.id = title;
    const isRead = (mark === undefined) ? ItemMap.get(title).readStatus : mark;

    const titleBoldClass = isRead ? '' : ' bold-read';
    const toggleBtnClass = isRead ? 'toggle-btn' : 'toggle-btn read';
    const toggleBtnContent = isRead ? '◯' : '✔'; //isRead ? '◯ Mark as unread' : '✔ Mark as read';

    titleElement.className = `item-title${titleBoldClass}`;

    const btnID = `btn-${title}`;
    let btn = document.getElementById(btnID);
    if (!btn) {
        btn = newElement('button', {id: btnID});
        dt.append(btn);
    }
    btn.className = toggleBtnClass;
    btn.innerHTML = toggleBtnContent;
}

function markRead(mark, dt) {
    const dts = dt? new Array(dt) : dtList;
    const id = dt? dt.querySelector('a').textContent : undefined;
    dts.forEach(dt => renderItem(dt, mark)); // This could be made async
    browser.runtime.sendMessage({content: "mark", mark:mark, id:id})
        .then(message => { dts.forEach(dt => ItemMap.get(dt.id).readStatus = mark) })
        .catch(error => {
            console.log(`Error marking: ${error}`);
            dts.forEach(dt => renderItem(dt, toggle(mark)));});
}

function refreshData() {
    console.log("refreshData");
    browser.runtime.sendMessage({content: "updateUI"})
        .then(message => { if (message.error) throw new Error(message.error);
			   ItemMap = new Map(message.map(item => [item.title, item]));
			   dtList.forEach(dt => renderItem(dt));
			   console.log("Refresh successful.");})
        .catch(error => console.log(`Error refreshing data: ${error}`));
}

function toggleItem(button) {
    const title = button.id.substring(4);
    if (!title) return;
    const newStatus = toggle(ItemMap.get(title).readStatus);
    markRead(newStatus, document.getElementById(title));
}

// No need to set a listener, set to run at 'document_end' in the manifest.js
editPreamble();
refreshData();

document.body.addEventListener('click', (event) => {
    const button = event.target.closest('button.toggle-btn, button.read');
    if (!button) return;
    event.stopPropagation();
    toggleItem(button);
});
