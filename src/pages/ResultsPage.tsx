import { useLocation, useNavigate } from "react-router-dom";
import ScoreCard from "../components/ScoreCard";
import { QuizResult } from "../types";

export default function ResultsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const result = location.state?.result as QuizResult | undefined;
  const sessionId = location.state?.sessionId as string | undefined;

  if (!result) {
    return (
      <div className="page results-page">
        <div className="empty-state">
          <h2>No Results Found</h2>
          <p>Complete a quiz to see your results.</p>
          <button className="btn btn-primary" onClick={() => navigate("/")}>
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const handleRetry = () => {
    navigate("/quiz", { state: { quiz: result.quiz, sessionId } });
  };

  const handleHome = () => {
    navigate("/");
  };

  const handleViewStudy = () => {
    if (sessionId) {
      navigate(`/study/${sessionId}`);
    }
  };

  return (
    <div className="page results-page">
      <ScoreCard result={result} onRetry={handleRetry} onHome={handleHome} onStudy={sessionId ? handleViewStudy : undefined} />
    </div>
  );
}
