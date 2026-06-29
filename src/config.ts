//Status related
const READ = 0 as const;
const UNREAD = 1 as const;
const UPDATED = 2 as const;
type Status = typeof READ | typeof UNREAD | typeof UPDATED;

function toggle(x: Status): Status {
  switch (x) {
    case READ:
      return UNREAD;
    case UNREAD:
      return READ;
    case UPDATED:
      return READ;
  }
}

//Schema related

type ConfigItemTypes = {
  weblog: { updateDate: string };
  notebooks: { updateDate: string; title: string };
  coreyrobin: { updateDate: string; title: string };
};
type schemaType = keyof ConfigItemTypes;

type DBItem<K extends schemaType> = ConfigItemTypes[K] & { readStatus: Status };

type Updater<K extends schemaType> = (
  item: ConfigItemTypes[K],
  existingItems: Map<string, ConfigItemTypes[K]>,
) => { needsUpdate: boolean; readStatus?: Status };

interface cfgEntry<K extends schemaType> {
  url: string;
  elListSelector: string;
  keyPath: keyof ConfigItemTypes[K];
  getter: (el: HTMLElement) => ConfigItemTypes[K];
  getUpdateStatus: Updater<K>;
}

type CFG = {
  [K in schemaType]: cfgEntry<K>;
};

//Schema configs
const SchemaVersion = 1;

const CONFIGS: CFG = {
  weblog: {
    url: "https://bactra.org/weblog/",
    elListSelector: ".blog:has(.date)",
    keyPath: "updateDate",
    getter: (el) => {
      const dateInput = el
        .querySelector(".date")
        ?.textContent.replace(/^\(|\)$/g, "");
      if (!dateInput) {
        throw new Error(`Element ${el} has no valid dateInput.`);
      }
      return { updateDate: new Date(dateInput).toISOString() };
    },
    getUpdateStatus: (item, existingItems) => {
      const existing = existingItems.get(item["updateDate"]);
      const readStatus = existing ? undefined : UNREAD;
      return { needsUpdate: !existing, readStatus };
    },
  },

  notebooks: {
    url: "https://bactra.org/notebooks/",
    elListSelector: "dt",
    keyPath: "title",
    getter: (el) => {
      const title = el.querySelector("a")?.textContent;
      if (!title) {
        throw new Error(`Element ${el} has no valid title.`);
      }
      const dateInput = el
        .querySelector("i")
        ?.textContent.replace(/^\(|\)$/g, "");
      if (!dateInput) {
        throw new Error(`Element ${el} has no valid dateInput.`);
      }
      return { title, updateDate: new Date(dateInput).toISOString() };
    },
    getUpdateStatus: (
      item: ConfigItemTypes["notebooks"],
      existingItems: Map<string, ConfigItemTypes["notebooks"]>,
    ) => {
      const existing = existingItems.get(item.title);
      if (!existing) {
        return { needsUpdate: true, readStatus: UNREAD };
      } else if (item.updateDate > existing.updateDate) {
        return { needsUpdate: true, readStatus: UPDATED };
      }
      return { needsUpdate: false };
    },
  },

  coreyrobin: {
    url: "https://coreyrobin.com/",
    elListSelector: "article",
    keyPath: "title",
    getter: (el) => {
      const title = el?.querySelector("header > h2 > a")?.textContent?.trim();
      if (!title) {
        throw new Error(`Element ${el} has no valid title.`);
      }
      const dateInput = el
        ?.querySelector(".dg__time")
        ?.getAttribute("datetime");
      if (!dateInput) {
        throw new Error(`Element ${el} has no valid dateInput.`);
      }
      return { title, updateDate: new Date(dateInput).toISOString() };
    },
    getUpdateStatus: (item, existingItems) => {
      const existing = existingItems.get(item["title"]);
      const readStatus = existing ? undefined : UNREAD;
      return { needsUpdate: !existing, readStatus };
    },
  },
};

const SchemaNames = Object.keys(CONFIGS) as schemaType[];

function getConfig<K extends schemaType>(
  location: Location,
): {
  schemaName: K;
  config: cfgEntry<K>;
} {
  let schemaName;
  switch (location.hostname) {
    case "bactra.org":
      schemaName = location.pathname.replace(/^\/+|\/+$/g, "") as K;
      break;
    case "coreyrobin.com":
      schemaName = "coreyrobin" as K;
      break;
    default:
      throw new Error(`The current url: ${location} is not accepted`);
  }
  return {
    schemaName,
    config: CONFIGS[schemaName],
  };
}

export {
  CONFIGS,
  toggle,
  getConfig,
  READ,
  UNREAD,
  UPDATED,
  SchemaVersion,
  SchemaNames,
};
export type { Status, schemaType, ConfigItemTypes, DBItem };
