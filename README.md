# SimpleFeed

## Overview

A Firefox extension that watches a blog-style web page and notifies you when new content appears.
Basically a poor man's solution for sites with no RSS or broken feeds. Asking the site owner to fix their broken RSS feed would be easier, but this is funnier.

## How it works

SimpleFeed periodically checks a URL and compares against and updates as needed an snapshot stored in IndexedDB.

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
