import { invoke } from "@tauri-apps/api/core";
import { TranscriptSegment } from "../types";

/**
 * Fetches the transcript for a YouTube video by calling the Rust backend.
 * All HTTP calls happen in Rust (reqwest) — bypasses webview CORS and
 * avoids TLS fingerprinting issues with the Tauri HTTP JS plugin.
 */
export async function getTranscript(
  videoUrl: string
): Promise<TranscriptSegment[]> {
  const videoId = extractVideoId(videoUrl);
  if (!videoId) {
    throw new Error("Invalid YouTube URL or video ID.");
  }

  const segments = await invoke<TranscriptSegment[]>("fetch_transcript", {
    videoId,
  });

  if (!segments || segments.length === 0) {
    throw new Error(
      "Transcript was empty. The video may not have captions available."
    );
  }

  return segments;
}

export function transcriptToText(segments: TranscriptSegment[]): string {
  return segments.map((s) => s.text).join(" ");
}

export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;

  return null;
}

export function getVideoThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}
