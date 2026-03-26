export async function fetchAndParse(schemaName) {
  // CONFIG is loaded as a global from config.js via background.xhtml
  const {url, dtListSelector, getter} = CONFIG[schemaName];
  return fetch(url)
    .then((response) => {
      if (!response.ok) { throw new Error(`HTTP error! Status: ${response.status}`); }
      return response.text();})
    .then((text) => {
      const parser = new DOMParser();
      const dts = parser
            .parseFromString(text, "text/html")
            .querySelectorAll(dtListSelector);
      return Array.from(dts).map((dt) => getter(dt));
    })
    .catch((error) => {
      console.error("Fetch failed:", error);
      browser.notifications.create({
        type: "basic",
        iconUrl: "icons/icon-48.png",
        title: `Fetch ${url} failed`,
        message: error.message
      });
      throw error;
    });
}
