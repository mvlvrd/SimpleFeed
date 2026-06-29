# SimpleFeed

## Overview

A Firefox extension that watches a blog-style web page and notifies you when new content appears.
Basically a poor man's solution for sites with no RSS or broken feeds. Asking the site owner to fix their broken RSS feed would be easier, but this is funnier.

## How it works

SimpleFeed periodically checks a URL and compares against an snapshot stored in IndexedDB and updates as needed.

1. User sets a target URL, a CSS selector (e.g., `article`, `.post`, `.entry`), in the `config.js`.
2. Every time that the browser is launched and later periodically (24 hours by default, though the periodicity can be set),
the extension fetches the pages HTML in the background and the response is parsed.
3. All elements matching the selector are collected.
For each match, the extension keeps an unique identifier (e.g., a post URL from a nested `<a>` or an `id` attribute)
4. The current list is compared with the previous snapshot stored in an IndexedDB instance.
5. If new items are found, the extension badge shows a notification.
6. A button appears next to each element in the tracked web pages. By clicking the button the tracked element is set as Read or Unread and show accordingly in the extension badge.
7. By clicking in the extension badge a popup is launched. There you can reset the database or mark all elements as read or unread.

The extension runs as a background script using `browser.alarms` to trigger periodic checks. The check interval can be adjusted in the popup settings.

## Configurations
SimpleFeed is driven by site configurations.
Each tracked website is described by a configuration object that tells the extension:
1. Which pages to fetch
2. How to find entries in the HTML
3. How to identify each entry uniquely
4. How to detect changes

Adding support for a new website usually only requires adding a new config entry.  
Site configurations are defined in `config.ts`.

A configuration looks like:
```ts
{
  name: {
    url: "https://bactra.org/weblog/",
    elListSelector: ".blog:has(.date)",
    keyPath: "updateDate",
    getter: (el) => {
      const dateElement = el.querySelector(".date");
      const updateDate = dateElement?.textContent.replace(/^\(|\)$/g, "");
      if (!updateDate) {throw new Error(`Element ${el} has no valid dateInput.`);}
      return {updateDate};
    }
}
```
Each field has a specific purpose:

---

###

#### `name`
The key of the config object, that servers as internal identifier of the website being tracked.
```ts
"weblog"
```

#### `url`

The page that SimpleFeed fetches. Example:
```ts
url: "https://bactra.org/weblog/"
```

---

#### `elListSelector`

The CSS selector used to find individual entries. Example:
```ts
selector: ".blog:has(.date)"
```

For a page like:
```html
<div class="blog-entry">
  <a href="/post-1">Post 1</a>
</div>

<div class="blog-entry">
  <a href="/post-2">Post 2</a>
</div>
```
would be:
```ts
selector: ".blog-entry"
```

---

#### `keyPath`

Defines how an item is uniquely identified. Example:

```ts
keyPath: (element) =>
  element.querySelector("a").href
```

#### `getter`

Defines the human-readable name shown in the UI. Example:

```ts
extractTitle: (element) =>
  element.querySelector("h2").textContent
```

This does not affect update detection, it only controls display.

---

#### `getUpdateStatus` (optional)



---

### Adding a new website
To track a new website:
1. Ddd the new configuration object to the `config.ts` file.
2. Reload the extension
3. Open the popup
4. Trigger an update

The new site will automatically get its own local database store.



## Permissions
- **`alarms`**: Periodically checks websites for new content in the background (default: every 24 hours).
- **`notifications`**: Alerts you when new or updated content is found on tracked websites.
- **`tabs`**: Prevents duplicate tabs, brings existing tabs to foreground, and communicates with content scripts to update read/unread status in real time.

## Data Handling

All data is stored locally in the IndexedDB instance. Nothing is sent to any external server.  
**Data collection permissions (`manifest.json`):
- **`websiteContent`**: Fetch site HTML.
- **`websiteActivity`**: Track reading progress.
To clear stored data use the "Reset All Data" button in the popup, or uninstall the extension.

## Packaging and Installation
**This extension is unsigned.** Firefox requires extensions distributed outside addons.mozilla.org to be signed, so it will only work on Firefox Developer Edition with the `xpinstall.signatures.required` option from `about:config` set to `false`.  
To install, run `npm run build` to create the extension zip file. Then just go to `about:addons` in your browser, click the gear icon and load the created zip file in the `Install Add-on From File...` menu. The `manifest.json` file is generated automatically using the number of commits in the current branch as the third number in the `version` string.

## License

SimpleFeed is Free Software licensed under [AGPL-3.0](https://www.gnu.org/licenses/agpl-3.0.html).


## Icons
<a href="https://www.flaticon.com/free-icons/rss" title="rss icons">Rss icons created by Freepik - Flaticon</a>
