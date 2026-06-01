export async function fetchAndParse(schemaName) {
  // CONFIG is loaded as a global from config.js via background.xhtml
  const {url, elListSelector, getter} = CONFIG[schemaName];
  return fetch(url)
    .then((response) => {
      if (!response.ok) { throw new Error(`HTTP error! Status: ${response.status}`); }
      return response.text();})
    .then((text) => {
      const parser = new DOMParser();
      const els = parser
            .parseFromString(text, "text/html")
            .querySelectorAll(elListSelector);
      return Array.from(els).map((el) => getter(el));
    })
    .catch((error) => {
      console.error("Fetch failed:", error);
      browser.notifications.create({
        type: "basic",
        iconUrl: "icons/rss.png",
        title: `Fetch ${url} failed`,
        message: error.message
      });
      throw error;
    });
}
