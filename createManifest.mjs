import fs from "fs";
import { execSync } from "child_process";
const { CONFIGS } = await import("./src/config.ts");

const n_commits = execSync('"git" rev-list --count HEAD', {
  encoding: "utf8",
}).trim();

const template = {
  manifest_version: 3,
  name: "SimpleFeed",
  version: undefined,
  description: "Replaces RSS",
  permissions: ["alarms", "notifications", "tabs"],

  browser_specific_settings: {
    gecko: {
      id: "SimpleFeed@mvlvrd.local",
      data_collection_permissions: {
        required: ["websiteContent", "websiteActivity"],
      },
    },
  },

  host_permissions: undefined,

  background: {
    page: "background.xhtml",
  },

  content_scripts: [
    {
      matches: undefined,
      css: ["ui/content.css"],
      js: ["ui/content.js"],
      run_at: "document_end",
    },
  ],

  action: {
    default_icon: {
      48: "icons/rss.png",
    },
    default_title: "SimpleFeed",
    default_popup: "popup/settings.html",
  },
};

const content_script_tmplt = template.content_scripts[0];

const urls = Object.values(CONFIGS).map((obj) => obj.url);
const host_permissions = urls;
const content_scripts = urls.map((url) => {
  return { ...content_script_tmplt, matches: [url] };
});
const version = `1.0.0.${n_commits}`;
const newManifest = Object.assign(
  structuredClone(template),
  { host_permissions },
  { content_scripts },
  { version },
);
const maniStr = JSON.stringify(newManifest, null, 2);

if (!fs.existsSync("dist/")) {
  fs.mkdirSync("dist/");
}
fs.writeFile("dist/manifest.json", maniStr, (err) => {
  if (err) {
    console.error(err);
  }
});
