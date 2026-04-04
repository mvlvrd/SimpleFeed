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
      const readStatus = existing ? undefined : UNREAD;
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
      const titleElement = dt.children[0];
      const dateElement = dt.children[dt.children.length - 1];
      const title = titleElement.textContent;
      const updateDate = new Date(dateElement.textContent.replace(/^\(|\)$/g, ""));
      if (!(dt.children.length === 2) || ! title || ! updateDate) {
	console.error(`Error parsing ${dt.children}`);
	for (const kk of dt.children) {console.log(kk)};
	console.error(`${title} ${updateDate}`)
      }
      return {title, updateDate};
    },
    getUpdateStatus: (item, existingItems) => {
      const existing = existingItems.get(item.title);
      if (!existing || item.updateDate > existing.updateDate) {
        const readStatus = existing ? existing.readStatus : UNREAD;
        return {needsUpdate: true, readStatus: UNREAD};
      }
      return {needsUpdate: false};
    }
  }
}
