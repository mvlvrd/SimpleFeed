const [READ, UNREAD, UPDATED] = [0, 1, 2];

function toggle(x) {
  switch (x) {
  case READ:
    return UNREAD;
  case UNREAD:
    return READ;
  case UPDATED:
    return READ;
  default:
    console.error(`Wrong input to toggle: ${x}`);
  }
}

function getSchema(location) {
  switch (location.hostname) {
  case "bactra.org":
    return location.pathname.replace(/^\/+|\/+$/g, "");
  case "coreyrobin.com":
    return "CoreyRobin";
  default:
    console.error(`Wrong input to getSchema: ${location}`);
  }
}

const CONFIG = {
  "weblog": {
    url: "https://bactra.org/weblog/",
    dtListSelector: ".blog:has(.date)",
    getKey: (item) => item.updateDate,
    getter: (dt) => {
      const dateElement = dt.querySelector(".date");
      return {updateDate: dateElement.textContent.replace(/^\n|\n$/g, "")};
    },
    getUpdateStatus: (item, existingItems) => {
      const existing = existingItems.get(item.updateDate);
      const readStatus = existing ? undefined : UNREAD;
      return {needsUpdate: !existing, readStatus};
    }
  },

  "notebooks": {
    url: "https://bactra.org/notebooks/",
    dtListSelector: "dt",
    getKey: (item) => item.title,
    getter: (dt) => {
      const titleElement = dt.querySelector("a");
      const dateElement = dt.querySelector("i");
      const title = titleElement.textContent;
      const updateDate = new Date(dateElement.textContent.replace(/^\(|\)$/g, ""));
      return {title, updateDate};
    },
    getUpdateStatus: (item, existingItems) => {
      const existing = existingItems.get(item.title);
      switch (true) {
      case (!existing):
        return {needsUpdate: true, readStatus: UNREAD};
        break;
      case (item.updateDate > existing.updateDate):
        return {needsUpdate: true, readStatus: UPDATED};
        break;
      default:
        return {needsUpdate: false};
        break;
      }
    }
  },

  "CoreyRobin": {
    url: "https://coreyrobin.com/",
    dtListSelector: "article",
    getKey: (item) => item.title,
    getter: (dt) => {
      const title = dt.querySelector("header > h2 > a").textContent.trim();
      const updateDate = new Date(dt.querySelector(".dg__time").getAttribute("datetime"));
      return {title, updateDate};
    },
    getUpdateStatus: (item, existingItems) => {
      const existing = existingItems.get(item.title);
      const readStatus = existing ? undefined : UNREAD;
      return {needsUpdate: !existing, readStatus};
    }
  }
}
