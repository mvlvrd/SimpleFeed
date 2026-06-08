type ConfigItemTypes = {
  weblog: {updateDate:string},
  notebooks: {updateDate:Date, title:string},
  coreyrobin: {updateDate:Date, title:string}
}
interface cfgEntry<K> {
  url: string,
  elListSelector: string,
  keyPath: string,
  getter: (el: HTMLElement) => K,
  getUpdateStatus: (item: K, existingItems: Map<string, K>) => {needsUpdate: boolean, readStatus?: number}
}
type schemaType = keyof ConfigItemTypes;
type CFG = {
  [K in schemaType]: cfgEntry<ConfigItemTypes[K]>;
}

export {CONFIGS, toggle, getConfig, READ, UNREAD, UPDATED, SchemaVersion};

const [READ, UNREAD, UPDATED] = [0, 1, 2] as const;

function toggle(x: number): number|undefined {
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

const SchemaVersion = 1;

const CONFIGS: CFG = {
  "weblog": {
    url: "https://bactra.org/weblog/",
    elListSelector: ".blog:has(.date)",
    keyPath: "updateDate",
    getter: (el) => {
      const dateElement = el.querySelector(".date");
      const updateDate = dateElement?.textContent.replace(/^\(|\)$/g, "");
      if (!updateDate) {throw new Error(`Element ${el} has no valid dateInput.`);}
      return {updateDate};
    },
    getUpdateStatus: (item, existingItems) => {
      const existing = existingItems.get(item.updateDate);
      const readStatus = existing ? undefined : UNREAD;
      return {needsUpdate: !existing, readStatus};
    }
  },

  "notebooks": {
    url: "https://bactra.org/notebooks/",
    elListSelector: "dt",
    keyPath: "title",
    getter: (el) => {
      const titleElement = el.querySelector("a");
      const dateElement = el.querySelector("i");
      const title = titleElement?.textContent;
      if (!title) {throw new Error(`Element ${el} has no valid title.`);}
      const dateInput = dateElement?.textContent.replace(/^\(|\)$/g, "");
      if (!dateInput) {throw new Error(`Element ${el} has no valid dateInput.`);}
      const updateDate = new Date(dateInput);
      return {title, updateDate};
    },
    getUpdateStatus: (item, existingItems) => {
      const existing = existingItems.get(item.title);
      if (!existing) {
        return {needsUpdate: true, readStatus: UNREAD};
      } else if (item.updateDate > existing?.updateDate) {
        return {needsUpdate: true, readStatus: UPDATED};
      }
      return {needsUpdate: false};
    }
  },

  "coreyrobin": {
    url: "https://coreyrobin.com/",
    elListSelector: "article",
    keyPath: "title",
    getter: (el) => {
      const title = el?.querySelector("header > h2 > a")?.textContent?.trim();
      if (!title) {throw new Error(`Element ${el} has no valid title.`);}
      const dateInput = el?.querySelector(".dg__time")?.getAttribute("datetime");
      if (!dateInput) {throw new Error(`Element ${el} has no valid dateInput.`);}
      const updateDate = new Date(dateInput);
      return {title, updateDate};
    },
    getUpdateStatus: (item, existingItems) => {
      const existing = existingItems.get(item.title);
      const readStatus = existing ? undefined : UNREAD;
      return {needsUpdate: !existing, readStatus};
    }
  }
};

function getConfig(location: Location): {schemaName: schemaType, config: cfgEntry<ConfigItemTypes[schemaType]>} {
  let schemaName;
  switch (location.hostname) {
    case "bactra.org":
      schemaName = location.pathname.replace(/^\/+|\/+$/g, "") as schemaType;
      break;
    case "coreyrobin.com":
      schemaName = "coreyrobin" as schemaType;
      break;
    default:
      throw new Error(`The current url: ${location} is not accepted`);
  }
  return {schemaName, config: CONFIGS[schemaName] as cfgEntry<ConfigItemTypes[schemaType]>};
}
