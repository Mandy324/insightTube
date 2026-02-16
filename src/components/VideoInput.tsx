import { useState } from "react";
import { Loader2, Play, Link as LinkIcon } from "lucide-react";

interface VideoInputProps {
  onSubmit: (url: string) => void;
  isLoading: boolean;
}

export default function VideoInput({ onSubmit, isLoading }: VideoInputProps) {
  const [url, setUrl] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim() && !isLoading) {
      onSubmit(url.trim());
    }
  };

  return (
    <form className="video-input-form" onSubmit={handleSubmit}>
      <div className="input-wrapper">
        <LinkIcon size={20} className="input-icon" />
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste a YouTube video URL..."
          className="url-input"
          disabled={isLoading}
        />
      </div>
      <button type="submit" className="btn btn-primary btn-generate" disabled={isLoading || !url.trim()}>
        {isLoading ? (
          <>
            <Loader2 size={18} className="spin" />
            <span>Generating...</span>
          </>
        ) : (
          <>
            <Play size={18} />
            <span>Generate Quiz</span>
          </>
        )}
      </button>
    </form>
  );
}
