use regex::Regex;
use reqwest::header::{HeaderMap, HeaderValue, ACCEPT_LANGUAGE, CONTENT_TYPE, USER_AGENT};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

const DEFAULT_USER_AGENT: &str =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TranscriptSegment {
    pub text: String,
    pub duration: f64,
    pub offset: f64,
    pub lang: String,
}

fn decode_xml_entities(text: &str) -> String {
    text.replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&#39;", "'")
        .replace("&apos;", "'")
}

fn build_client() -> Result<reqwest::Client, String> {
    let mut headers = HeaderMap::new();
    headers.insert(USER_AGENT, HeaderValue::from_static(DEFAULT_USER_AGENT));
    headers.insert(ACCEPT_LANGUAGE, HeaderValue::from_static("en"));

    reqwest::Client::builder()
        .default_headers(headers)
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {}", e))
}

#[tauri::command]
pub async fn fetch_transcript(video_id: String) -> Result<Vec<TranscriptSegment>, String> {
    let client = build_client()?;

    // Step 1: Fetch watch page to extract Innertube API key
    let watch_url = format!("https://www.youtube.com/watch?v={}", video_id);
    let video_page_res = client
        .get(&watch_url)
        .send()
        .await
        .map_err(|e| format!("Failed to load video page: {}", e))?;

    if !video_page_res.status().is_success() {
        return Err(format!(
            "Failed to load video page (HTTP {}). The video may be unavailable.",
            video_page_res.status().as_u16()
        ));
    }

    let video_page_body = video_page_res
        .text()
        .await
        .map_err(|e| format!("Failed to read video page body: {}", e))?;

    if video_page_body.contains("class=\"g-recaptcha\"") {
        return Err("YouTube is requesting a CAPTCHA. Please try again later.".into());
    }

    // Extract API key
    let api_key_re1 = Regex::new(r#""INNERTUBE_API_KEY":"([^"]+)""#).unwrap();
    let api_key_re2 = Regex::new(r#"INNERTUBE_API_KEY\\":\\"([^\\"]+)\\""#).unwrap();

    let api_key = api_key_re1
        .captures(&video_page_body)
        .or_else(|| api_key_re2.captures(&video_page_body))
        .and_then(|c| c.get(1))
        .map(|m| m.as_str().to_string())
        .ok_or("Could not extract YouTube API key. The video may not have transcripts available.")?;

    // Step 2: Call Innertube player API to get caption tracks
    let player_url = format!(
        "https://www.youtube.com/youtubei/v1/player?key={}",
        api_key
    );

    let player_body = serde_json::json!({
        "context": {
            "client": {
                "clientName": "ANDROID",
                "clientVersion": "20.10.38"
            }
        },
        "videoId": video_id
    });

    let mut player_res = client
        .post(&player_url)
        .header(CONTENT_TYPE, "application/json")
        .json(&player_body)
        .send()
        .await
        .map_err(|e| format!("Failed to fetch video metadata: {}", e))?;

    // If ANDROID client gets rejected, try WEB client with browser-like headers
    if !player_res.status().is_success() {
        let web_player_body = serde_json::json!({
            "context": {
                "client": {
                    "clientName": "WEB",
                    "clientVersion": "2.20250122.01.00",
                    "hl": "en",
                    "gl": "US"
                }
            },
            "videoId": video_id
        });

        player_res = client
            .post(&player_url)
            .header(CONTENT_TYPE, "application/json")
            .header("X-Youtube-Client-Name", "1")
            .header("X-Youtube-Client-Version", "2.20250122.01.00")
            .header("Origin", "https://www.youtube.com")
            .header("Referer", &watch_url)
            .json(&web_player_body)
            .send()
            .await
            .map_err(|e| format!("Failed to fetch video metadata (WEB fallback): {}", e))?;
    }

    if !player_res.status().is_success() {
        return Err(format!(
            "Failed to fetch video metadata (HTTP {}). The video may be unavailable.",
            player_res.status().as_u16()
        ));
    }

    let player_json: serde_json::Value = player_res
        .json()
        .await
        .map_err(|e| format!("Failed to parse player response: {}", e))?;

    // Extract caption tracks
    let tracklist = player_json
        .get("captions")
        .and_then(|c| c.get("playerCaptionsTracklistRenderer"))
        .or_else(|| player_json.get("playerCaptionsTracklistRenderer"));

    let tracks = tracklist.and_then(|t| t.get("captionTracks")).and_then(|t| t.as_array());

    if tracklist.is_none() {
        let is_playable = player_json
            .get("playabilityStatus")
            .and_then(|p| p.get("status"))
            .and_then(|s| s.as_str())
            == Some("OK");

        return Err(if is_playable {
            "Transcripts are disabled for this video.".into()
        } else {
            "No transcript available for this video.".into()
        });
    }

    let tracks = tracks.ok_or("Transcripts are disabled for this video.")?;
    if tracks.is_empty() {
        return Err("Transcripts are disabled for this video.".into());
    }

    // Prefer English, fallback to first track
    let selected_track = tracks
        .iter()
        .find(|t| t.get("languageCode").and_then(|l| l.as_str()) == Some("en"))
        .or_else(|| tracks.first())
        .ok_or("No caption track found.")?;

    let lang_code = selected_track
        .get("languageCode")
        .and_then(|l| l.as_str())
        .unwrap_or("en")
        .to_string();

    // Step 3: Fetch transcript XML
    let transcript_url = selected_track
        .get("baseUrl")
        .or_else(|| selected_track.get("url"))
        .and_then(|u| u.as_str())
        .ok_or("No transcript URL found for this video.")?;

    // Strip &fmt= parameter to get XML
    let fmt_re = Regex::new(r"&fmt=[^&]+").unwrap();
    let transcript_url = fmt_re.replace(transcript_url, "").to_string();

    let transcript_res = client
        .get(&transcript_url)
        .send()
        .await
        .map_err(|e| format!("Failed to fetch transcript: {}", e))?;

    if transcript_res.status().as_u16() == 429 {
        return Err("Too many requests. Please try again later.".into());
    }

    if !transcript_res.status().is_success() {
        return Err(format!(
            "Failed to fetch transcript (HTTP {}).",
            transcript_res.status().as_u16()
        ));
    }

    let transcript_body = transcript_res
        .text()
        .await
        .map_err(|e| format!("Failed to read transcript body: {}", e))?;

    // Step 4: Parse XML into segments
    let xml_re = Regex::new(r#"<text start="([^"]*)" dur="([^"]*)">([^<]*)</text>"#).unwrap();

    let segments: Vec<TranscriptSegment> = xml_re
        .captures_iter(&transcript_body)
        .map(|cap| TranscriptSegment {
            text: decode_xml_entities(&cap[3]),
            duration: cap[2].parse::<f64>().unwrap_or(0.0),
            offset: cap[1].parse::<f64>().unwrap_or(0.0),
            lang: lang_code.clone(),
        })
        .collect();

    if segments.is_empty() {
        return Err("Transcript was empty. The video may not have captions available.".into());
    }

    Ok(segments)
}
