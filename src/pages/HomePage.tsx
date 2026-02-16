import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Play, Clock } from "lucide-react";
import VideoInput from "../components/VideoInput";
import ModelSelector from "../components/ModelSelector";
import { getTranscript, transcriptToText, extractVideoId, getVideoThumbnail, getVideoInfo } from "../services/transcript";
import { generateQuiz, getDefaultModelForProvider } from "../services/ai";
import { getSettings, saveSettings, getVideoSessionByVideoId, saveVideoSession, getVideoSessions } from "../services/storage";
import { Quiz, AppSettings, VideoSession } from "../types";

type Stage = "idle" | "transcript" | "info" | "generating" | "done";

export default function HomePage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [stage, setStage] = useState<Stage>("idle");
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [recentSessions, setRecentSessions] = useState<VideoSession[]>([]);

  useEffect(() => {
    getSettings().then(setSettings);
    getVideoSessions().then((sessions) => setRecentSessions(sessions.slice(0, 6)));
  }, []);

  const hasApiKey = settings
    ? settings.selectedProvider === "openai"
      ? !!settings.openaiApiKey
      : !!settings.geminiApiKey
    : false;

  const currentApiKey = settings
    ? settings.selectedProvider === "openai"
      ? settings.openaiApiKey
      : settings.geminiApiKey
    : "";

  const handleModelChange = (modelId: string) => {
    if (!settings) return;
    const updated = { ...settings, selectedModel: modelId };
    setSettings(updated);
    saveSettings(updated);
  };

  const handleSubmit = async (url: string) => {
    if (!settings) return;
    setError(null);
    setIsLoading(true);
    setThumbnail(null);

    try {
      const videoId = extractVideoId(url);
      if (!videoId) {
        throw new Error("Invalid YouTube URL. Please enter a valid YouTube video link.");
      }

      setThumbnail(getVideoThumbnail(videoId));

      // Check if session already exists
      let session = await getVideoSessionByVideoId(videoId);
      if (session) {
        // Already processed — go straight to study page
        navigate(`/study/${session.id}?tab=quizHistory`);
        return;
      }

      // Step 1: Fetch transcript + video info in parallel
      setStage("transcript");
      const [transcript, videoInfo] = await Promise.all([
        getTranscript(url),
        getVideoInfo(videoId),
      ]);

      if (!transcript.length) {
        throw new Error("No transcript found for this video. The video may not have captions available.");
      }

      const transcriptText = transcriptToText(transcript);

      // Step 2: Generate quiz
      setStage("generating");
      const apiKey =
        settings.selectedProvider === "openai"
          ? settings.openaiApiKey
          : settings.geminiApiKey;

      const model = settings.selectedModel || getDefaultModelForProvider(settings.selectedProvider);

      const questions = await generateQuiz(
        settings.selectedProvider,
        apiKey,
        transcriptText,
        settings.questionCount,
        model
      );

      const quiz: Quiz = {
        videoTitle: videoInfo.title,
        videoUrl: url,
        questions,
        version: 1,
        createdAt: new Date().toISOString(),
      };

      // Persist the video session with quiz
      session = {
        id: crypto.randomUUID(),
        videoId,
        videoUrl: url,
        videoTitle: videoInfo.title,
        thumbnailUrl: getVideoThumbnail(videoId),
        transcript: transcriptText,
        createdAt: new Date().toISOString(),
        quizResults: [],
        studyMaterials: {},
        latestQuiz: quiz,
      };
      await saveVideoSession(session);

      setStage("done");

      // Navigate to study page — quiz tab
      navigate(`/study/${session.id}?tab=quizHistory`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setError(message);
    } finally {
      setIsLoading(false);
      setStage("idle");
    }
  };

  const getStageMessage = () => {
    switch (stage) {
      case "transcript":
        return "Fetching video transcript & info...";
      case "generating":
        return "AI is generating your quiz...";
      default:
        return "";
    }
  };

  return (
    <div className="page home-page">
      <div className="home-hero">
        <div className="hero-glow" />
        <img src="/logo.svg" alt="InsightTube" className="hero-logo" />
        <h1 className="hero-title">
          Turn Videos Into <span className="gradient-text">Knowledge</span>
        </h1>
        <p className="hero-subtitle">
          Paste any YouTube link to generate quizzes, study guides, flashcards, and mind maps.
        </p>
      </div>

      {!hasApiKey && settings && (
        <div className="alert alert-warning">
          <AlertCircle size={18} />
          <div>
            <strong>API Key Required</strong>
            <p>
              Configure your {settings.selectedProvider === "openai" ? "OpenAI" : "Gemini"} API key in{" "}
              <a onClick={() => navigate("/settings")} className="alert-link">
                Settings
              </a>{" "}
              to generate quizzes.
            </p>
          </div>
        </div>
      )}

      <div className="home-input-section">
        <VideoInput onSubmit={handleSubmit} isLoading={isLoading} />

        {settings && (
          <ModelSelector
            provider={settings.selectedProvider}
            apiKey={currentApiKey}
            selectedModel={settings.selectedModel}
            onModelChange={handleModelChange}
            disabled={isLoading}
          />
        )}
      </div>

      {isLoading && (
        <div className="loading-state">
          {thumbnail && (
            <div className="loading-thumbnail">
              <img src={thumbnail} alt="Video thumbnail" />
            </div>
          )}
          <div className="loading-indicator">
            <div className="loading-dots">
              <span /><span /><span />
            </div>
            <p className="loading-text">{getStageMessage()}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          <AlertCircle size={18} />
          <div>
            <strong>Error</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      {!isLoading && recentSessions.length > 0 && (
        <div className="recent-videos-section">
          <h3 className="recent-heading">
            <Clock size={16} />
            Recent Videos
          </h3>
          <div className="recent-videos-grid">
            {recentSessions.map((session) => (
              <div
                key={session.id}
                className="recent-video-card"
                onClick={() => navigate(`/study/${session.id}`)}
              >
                <div className="recent-video-thumb">
                  <img src={session.thumbnailUrl} alt={session.videoTitle} />
                  <div className="recent-video-play">
                    <Play size={14} />
                  </div>
                </div>
                <div className="recent-video-info">
                  <div className="recent-video-title">{session.videoTitle}</div>
                  <div className="recent-video-meta">
                    {new Date(session.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
