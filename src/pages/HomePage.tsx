import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, AlertCircle, BookOpen, Zap, Brain } from "lucide-react";
import VideoInput from "../components/VideoInput";
import { getTranscript, transcriptToText, extractVideoId, getVideoThumbnail } from "../services/transcript";
import { generateQuiz } from "../services/ai";
import { getSettings } from "../services/storage";
import { Quiz, AppSettings } from "../types";

type Stage = "idle" | "transcript" | "generating" | "done";

export default function HomePage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [stage, setStage] = useState<Stage>("idle");
  const [thumbnail, setThumbnail] = useState<string | null>(null);

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  const hasApiKey = settings
    ? settings.selectedProvider === "openai"
      ? !!settings.openaiApiKey
      : !!settings.geminiApiKey
    : false;

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

      // Step 1: Fetch transcript
      setStage("transcript");
      const transcript = await getTranscript(url);
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

      const questions = await generateQuiz(
        settings.selectedProvider,
        apiKey,
        transcriptText,
        settings.questionCount
      );

      const quiz: Quiz = {
        videoTitle: `YouTube Video (${videoId})`,
        videoUrl: url,
        questions,
      };

      setStage("done");

      // Navigate to quiz page with quiz data
      navigate("/quiz", { state: { quiz } });
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
        return "Fetching video transcript...";
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
        <Sparkles size={40} className="hero-icon" />
        <h1 className="hero-title">
          Turn Videos Into <span className="gradient-text">Interactive Quizzes</span>
        </h1>
        <p className="hero-subtitle">
          Paste any YouTube link and let AI transform it into a comprehensive quiz to test your understanding.
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

      <VideoInput onSubmit={handleSubmit} isLoading={isLoading} />

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

      <div className="features-grid">
        <div className="feature-card">
          <BookOpen size={28} className="feature-icon" />
          <h3>Smart Extraction</h3>
          <p>Automatically extracts transcripts from any YouTube video with captions.</p>
        </div>
        <div className="feature-card">
          <Brain size={28} className="feature-icon" />
          <h3>AI-Powered Quizzes</h3>
          <p>Generates targeted questions that test real comprehension, not just memorization.</p>
        </div>
        <div className="feature-card">
          <Zap size={28} className="feature-icon" />
          <h3>Instant Feedback</h3>
          <p>Get immediate explanations for every answer to reinforce your learning.</p>
        </div>
      </div>
    </div>
  );
}
