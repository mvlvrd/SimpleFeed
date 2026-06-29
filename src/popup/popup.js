import { CONFIGS, READ, UNREAD } from "../config.ts";

const selector =
  /** @type {HTMLInputElement} */
  (document.getElementById("schemas"));

async function loadSchemas() {
  /** @param {string} value
      @param {string} textContent */
  const add = (value, textContent) =>
    selector?.appendChild(
      Object.assign(document.createElement("option"), { value, textContent }),
    );

  add("", "all");
  for (const schemaName of Object.keys(CONFIGS)) {
    add(schemaName, schemaName);
  }
}
loadSchemas();

const alarmInput =
  /** @type {HTMLInputElement} */
  (
    document.getElementById("alarmMinutes") ??
      (() => {
        throw new ReferenceError("Element 'alarmMinutes' not found.");
      })()
  );

sendMessage("getAlarmPeriod")
  .then((message) => {
    alarmInput.value = message.alarmPeriod;
  })
  .catch((error) => console.error(error));

/** @param {import('../config').Status} mark */
async function markAll(mark) {
  //TODO: This doesn't work.
  const schemaName = selector?.value;
  console.log(schemaName);
  await sendMessage("MarkAll", { schemaName, mark });
  showStatus(`Marked ALL schemas as ${mark === READ ? "read" : "unread"}`);
}

document
  .getElementById("markAllReadBtn")
  ?.addEventListener("click", () => markAll(READ));
document
  .getElementById("markAllUnreadBtn")
  ?.addEventListener("click", () => markAll(UNREAD));

document.getElementById("resetBtn")?.addEventListener("click", async () => {
  await sendMessage("reset");
  showStatus("Reset completed");
});

document.getElementById("UpdateBtn")?.addEventListener("click", async () => {
  await sendMessage("update");
  showStatus("Updating...");
});

document
  .getElementById("openAllUrlsBtn")
  ?.addEventListener("click", async () => {
    await sendMessage("openURL");
    showStatus("Opening all URLs...");
  });

document.getElementById("setAlarmBtn")?.addEventListener("click", async () => {
  const minuteEl = /** @type {HTMLInputElement} */ (
    document.getElementById("alarmMinutes")
  );
  const minutes = parseInt(minuteEl.value);
  if (isNaN(minutes) || minutes < 1) {
    showStatus("Please enter a valid number (>=1)", true);
    return;
  }
  await sendMessage("setAlarmPeriod", { minutes });
  showStatus(`Alarm period set to ${minutes} minutes`);
});

/** @param {string} content
    @param {object} [data]
 **/
async function sendMessage(content, data = {}) {
  console.log(`Sending popup message: ${content} ${data}`);
  try {
    const response = await browser.runtime.sendMessage({ content, ...data });
    if (response && response.error) {
      showStatus(`Error: ${response.error}`, true);
    }
    return response;
  } catch (err) {
    const msg =
      err &&
      typeof err === "object" &&
      "message" in err &&
      typeof err.message === "string"
        ? err.message
        : err;
    showStatus(`Error: ${msg}`, true);
    throw err;
  }
}

/** @param {string} msg
    @param {boolean} isError
 **/
function showStatus(msg, isError = false) {
  const statusDiv =
    document.getElementById("status") ??
    (() => {
      throw new ReferenceError("Element 'status' not found.");
    })();
  statusDiv.textContent = msg;
  statusDiv.style.color = isError ? "red" : "green";
  setTimeout(() => {
    statusDiv.textContent = "";
  }, 3000);
}
