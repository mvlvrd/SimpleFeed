export const TARGET_URL = 'https://bactra.org/notebooks/';

function getItems(text) {
    const parser = new DOMParser();
    const dts = parser
	  .parseFromString(text, "text/html")
	  .querySelectorAll("dt");
    return Array.from(dts).map(dt => {
	const [titleElement, dateElement] = dt.children;
	return {title: titleElement.textContent,
		updateDate: new Date(dateElement.textContent.replace(/^\(|\)$/g, "")),
		linkURL: titleElement.href,
		readStatus: 0}
    });
}

export async function fetchAndParse() {
    return fetch(TARGET_URL)
	.then(response => {
	    if (!response.ok) {
		throw new Error(`HTTP error! Status: ${response.status}`);
	    }
	    return response.text()})
        .then(getItems)
	.catch(error => {
	    console.error("Fetch failed:", error);
	    browser.notifications.create({
	      type: "basic",
	      iconUrl: "icons/icon-48.png",
	      title: "Fetch Failed",
	      message: error.message
	    });
	    throw error;
	});
}
