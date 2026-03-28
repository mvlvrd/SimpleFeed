const [UNREAD, READ] = [0, 1];

const toggle = (x) => 1 - x;

const CONFIG = {
  "weblog": {
    url: "https://bactra.org/weblog/",
    dtListSelector: ".blog:has(.date)",
    elementSelector: "h2",
    classNameCSS: (keyBoldClass) => `date${keyBoldClass}`,
    getKey: (item) => item.updateDate,
    getter: (dt) => {
      return {updateDate: dt.textContent.replace(/^\n|\n$/g, "")};
    },
    getUpdateStatus: (item, existingItems) => {
      const existing = existingItems.get(item.updateDate);
      const readStatus = existing? undefined: UNREAD;
      return {needsUpdate: !existing, readStatus};
    }
  },

  "notebooks": {
    url: "https://bactra.org/notebooks/",
    dtListSelector: "dt",
    elementSelector: "a",
    classNameCSS: (keyBoldClass) => `item-title${keyBoldClass}`,
    getKey: (item) => item.title,
    getter: (dt) => {
      const [titleElement, dateElement] = dt.children;
      return {title: titleElement.textContent,
              updateDate: new Date(dateElement.textContent.replace(/^\(|\)$/g, ""))};
    },
    getUpdateStatus: (item, existingItems) => {
      const existing = existingItems.get(item.title);
      if (!existing || item.updateDate > existing.updateDate) {
        const readStatus = existing ? existing.readStatus : UNREAD;
        return {needsUpdate: true, readStatus: readStatus};
      }
      return {needsUpdate: false};
    }
  }
}
