# SimpleFeed

## Overview

A Firefox extension that watches a blog-style web page and notifies you when new content appears.
Basically a poor man's solution for sites with no RSS or broken feeds. Asking the site owner to fix their broken RSS feed would be easier,
but this is funnier.

## How it works

SimpleFeed periodically checks a URL and compares against and updates as needed an snapshot stored in IndexedDB.

1. User sets a target URL, a CSS selector (e.g., `article`, `.post`, `.entry`), in the `config.js`.
You will also need to modify the `manifest.json` to give the right permissions.
It is a bit bothersome, but in any case you also have to recreate the the package and so on, so it's not a bit issue. 
2. Every time that the browser is launched and later periodically (24 hours by default, though the periodicity can be set),
the extension fetches the pages HTML in the background and the response is parsed.
3. All elements matching the selector are collected.
For each match, the extension keeps an unique identifier (e.g., a post URL from a nested `<a>` or an `id` attribute)
4. The current list is compared with the previous snapshot stored in an IndexedDB instance.
5. If new items are found, the extension badge shows a notification.
6. A button appears next to each element in the tracked web pages. By clicking the button the tracked element is set as Read or Unread and show accordingly in the extension badge.
7. By clicking in the extension badge a popup is launched. There you can reset the database or mark all elements as read or unread.

The extension runs as a background script using `browser.alarms` to trigger periodic checks. The periodicity may be set in the extension popup.

## Packaging and Installation

To package run `web-ext build` to create the extension zip file. Then just go to `about:addons` in your browser,
and load the created zip file in the `Install Add-on From File...` menu.
The extension is written and tested in Firefox. It's not registered so will not work in vanilla Firefox ...

## License

Notebooks is Free Software licensed under [AGPL-3.0](https://www.gnu.org/licenses/agpl-3.0.html).
