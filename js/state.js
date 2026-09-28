const KEY_URL = "pagosmp.url";
const KEY_TOKEN = "pagosmp.token";

export function getSettings() {
  return {
    url: localStorage.getItem(KEY_URL) || "",
    token: localStorage.getItem(KEY_TOKEN) || "",
  };
}

export function setSettings({ url, token }) {
  if (url !== undefined) localStorage.setItem(KEY_URL, url);
  if (token !== undefined) localStorage.setItem(KEY_TOKEN, token);
}
