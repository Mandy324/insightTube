import { load } from "@tauri-apps/plugin-store";
import { AppSettings, DEFAULT_SETTINGS } from "../types";

const STORE_NAME = "settings.json";
const SETTINGS_KEY = "app_settings";

let storeInstance: Awaited<ReturnType<typeof load>> | null = null;

async function getStore() {
  if (!storeInstance) {
    storeInstance = await load(STORE_NAME, { autoSave: true, defaults: {} });
  }
  return storeInstance;
}

export async function getSettings(): Promise<AppSettings> {
  try {
    const store = await getStore();
    const settings = await store.get<AppSettings>(SETTINGS_KEY);
    return settings ? { ...DEFAULT_SETTINGS, ...settings } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const store = await getStore();
  await store.set(SETTINGS_KEY, settings);
  await store.save();
}

export async function getApiKey(
  provider: "openai" | "gemini"
): Promise<string> {
  const settings = await getSettings();
  return provider === "openai"
    ? settings.openaiApiKey
    : settings.geminiApiKey;
}
