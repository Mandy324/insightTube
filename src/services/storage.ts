import { load } from "@tauri-apps/plugin-store";
import { AppSettings, DEFAULT_SETTINGS, VideoSession, QuizResult } from "../types";

const STORE_NAME = "settings.json";
const DATA_STORE_NAME = "data.json";
const SETTINGS_KEY = "app_settings";
const SESSIONS_KEY = "video_sessions";

let storeInstance: Awaited<ReturnType<typeof load>> | null = null;
let dataStoreInstance: Awaited<ReturnType<typeof load>> | null = null;

async function getStore() {
  if (!storeInstance) {
    storeInstance = await load(STORE_NAME, { autoSave: true, defaults: {} });
  }
  return storeInstance;
}

async function getDataStore() {
  if (!dataStoreInstance) {
    dataStoreInstance = await load(DATA_STORE_NAME, { autoSave: true, defaults: {} });
  }
  return dataStoreInstance;
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

/* ---- Video Sessions ---- */

export async function getVideoSessions(): Promise<VideoSession[]> {
  try {
    const store = await getDataStore();
    const sessions = await store.get<VideoSession[]>(SESSIONS_KEY);
    return sessions || [];
  } catch {
    return [];
  }
}

export async function saveVideoSession(session: VideoSession): Promise<void> {
  const store = await getDataStore();
  const sessions = await getVideoSessions();
  const idx = sessions.findIndex((s) => s.id === session.id);
  if (idx >= 0) {
    sessions[idx] = session;
  } else {
    sessions.unshift(session); // newest first
  }
  await store.set(SESSIONS_KEY, sessions);
  await store.save();
}

export async function getVideoSessionById(id: string): Promise<VideoSession | null> {
  const sessions = await getVideoSessions();
  return sessions.find((s) => s.id === id) || null;
}

export async function getVideoSessionByVideoId(videoId: string): Promise<VideoSession | null> {
  const sessions = await getVideoSessions();
  return sessions.find((s) => s.videoId === videoId) || null;
}

export async function addQuizResultToSession(
  sessionId: string,
  result: QuizResult
): Promise<void> {
  const sessions = await getVideoSessions();
  const session = sessions.find((s) => s.id === sessionId);
  if (session) {
    session.quizResults.push(result);
    await saveVideoSession(session);
  }
}

export async function deleteVideoSession(id: string): Promise<void> {
  const store = await getDataStore();
  const sessions = await getVideoSessions();
  const filtered = sessions.filter((s) => s.id !== id);
  await store.set(SESSIONS_KEY, filtered);
  await store.save();
}

/* ---- Dashboard Stats ---- */

export interface DashboardStats {
  totalVideos: number;
  totalQuizzes: number;
  totalQuestions: number;
  averageScore: number;
  bestScore: number;
  currentStreak: number;
  recentSessions: VideoSession[];
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const sessions = await getVideoSessions();
  const allResults = sessions.flatMap((s) => s.quizResults);

  const totalVideos = sessions.length;
  const totalQuizzes = allResults.length;
  const totalQuestions = allResults.reduce((a, r) => a + r.totalQuestions, 0);

  const scores = allResults.map((r) =>
    r.totalQuestions > 0 ? Math.round((r.score / r.totalQuestions) * 100) : 0
  );
  const averageScore =
    scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;
  const bestScore = scores.length > 0 ? Math.max(...scores) : 0;

  // Calculate streak: consecutive days with at least one quiz
  let currentStreak = 0;
  if (allResults.length > 0) {
    const sortedDates = allResults
      .map((r) => new Date(r.completedAt).toDateString())
      .filter((v, i, a) => a.indexOf(v) === i) // unique dates
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    if (sortedDates[0] === today || sortedDates[0] === yesterday) {
      currentStreak = 1;
      for (let i = 1; i < sortedDates.length; i++) {
        const prev = new Date(sortedDates[i - 1]).getTime();
        const curr = new Date(sortedDates[i]).getTime();
        if (prev - curr <= 86400000 * 1.5) {
          currentStreak++;
        } else {
          break;
        }
      }
    }
  }

  return {
    totalVideos,
    totalQuizzes,
    totalQuestions,
    averageScore,
    bestScore,
    currentStreak,
    recentSessions: sessions.slice(0, 5),
  };
}
