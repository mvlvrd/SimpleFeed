const selector = document.getElementById("schemas");

const newElement = (element, obj) => Object.assign(document.createElement(element), obj);

async function loadSchemas() {
  selector.appendChild(newElement("option", {value: "", textContent: "all"}));
  for (const schemaName of Object.keys(CONFIG)) {
    selector.appendChild(newElement("option", {value: schemaName, textContent: schemaName}));
  }
}
loadSchemas();

const alarmInput = document.getElementById("alarmMinutes");
sendMessage("getAlarmPeriod")
  .then((message) => {
    alarmInput.value = message.alarmPeriod;
  })
  .catch((error) => console.error(error));

async function markAllSchemas(mark) {
  const schemaName = selector.value || undefined;
  console.log(schemaName);
  await sendMessage("MarkAll", { schemaName, mark });
  showStatus(`Marked ALL schemas as ${mark === 1 ? "read" : "unread"}`);
}

document.getElementById("markAllReadBtn").addEventListener("click", () => markAllSchemas(READ));
document.getElementById("markAllUnreadBtn").addEventListener("click", () => markAllSchemas(UNREAD));

document.getElementById("resetBtn").addEventListener("click", async () => {
  await sendMessage("reset");
  showStatus("Reset completed");
});

document.getElementById("openAllUrlsBtn").addEventListener("click", async () => {
  await sendMessage("openURL");
  showStatus("Opening all URLs...");
});

document.getElementById("setAlarmBtn").addEventListener("click", async () => {
  const minutes = parseInt(document.getElementById("alarmMinutes").value);
  if (isNaN(minutes) || minutes < 1) {
    showStatus("Please enter a valid number (>=1)", true);
    return;
  }
  await sendMessage("setAlarmPeriod", { minutes });
  showStatus(`Alarm period set to ${minutes} minutes`);
});

async function sendMessage(content, data = {}) {
  console.log(`Sending popup message: ${content} ${data}`);
  try {
    const response = await browser.runtime.sendMessage({ content, ...data });
    if (response && response.error) {
      showStatus(`Error: ${response.error}`, true);
    }
    return response;
  } catch (err) {
    showStatus(`Error: ${err.message}`, true);
    throw err;
  }
}

function showStatus(msg, isError = false) {
  const statusDiv = document.getElementById("status");
  statusDiv.textContent = msg;
  statusDiv.style.color = isError ? "red" : "green";
  setTimeout(() => {
    statusDiv.textContent = "";
  }, 3000);
}
