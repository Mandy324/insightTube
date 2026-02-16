import { QuizResult } from "../types";
import { Trophy, Target, RotateCcw, Home, BookOpen } from "lucide-react";

interface ScoreCardProps {
  result: QuizResult;
  onRetry: () => void;
  onHome: () => void;
  onStudy?: () => void;
}

export default function ScoreCard({ result, onRetry, onHome, onStudy }: ScoreCardProps) {
  const percentage = Math.round(
    (result.score / result.totalQuestions) * 100
  );

  const getGrade = () => {
    if (percentage >= 90) return { label: "Excellent!", color: "var(--color-success)" };
    if (percentage >= 70) return { label: "Great Job!", color: "var(--color-primary)" };
    if (percentage >= 50) return { label: "Good Effort", color: "var(--color-warning)" };
    return { label: "Keep Learning", color: "var(--color-error)" };
  };

  const grade = getGrade();

  return (
    <div className="score-card">
      <div className="score-header">
        <Trophy size={48} style={{ color: grade.color }} />
        <h1 className="score-grade" style={{ color: grade.color }}>
          {grade.label}
        </h1>
      </div>

      <div className="score-circle-container">
        <svg className="score-circle" viewBox="0 0 120 120">
          <circle
            className="score-circle-bg"
            cx="60"
            cy="60"
            r="50"
            fill="none"
            strokeWidth="10"
          />
          <circle
            className="score-circle-fill"
            cx="60"
            cy="60"
            r="50"
            fill="none"
            strokeWidth="10"
            strokeDasharray={`${percentage * 3.14} ${314 - percentage * 3.14}`}
            strokeDashoffset="0"
            transform="rotate(-90 60 60)"
            style={{ stroke: grade.color }}
          />
        </svg>
        <div className="score-percentage">{percentage}%</div>
      </div>

      <div className="score-details">
        <div className="score-stat">
          <Target size={20} />
          <span>
            {result.score} / {result.totalQuestions} correct
          </span>
        </div>
      </div>

      <div className="score-review">
        <h3>Question Review</h3>
        {result.quiz.questions.map((q, i) => (
          <div
            key={i}
            className={`review-item ${result.answers[i] === q.correctAnswer ? "correct" : "incorrect"}`}
          >
            <div className="review-indicator">
              {result.answers[i] === q.correctAnswer ? "✓" : "✗"}
            </div>
            <div className="review-content">
              <p className="review-question">{q.question}</p>
              {result.answers[i] !== q.correctAnswer && (
                <p className="review-answer">
                  Correct: {q.options[q.correctAnswer]}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="score-actions">
        <button className="btn btn-secondary" onClick={onRetry}>
          <RotateCcw size={18} />
          <span>Retry Quiz</span>
        </button>
        {onStudy && (
          <button className="btn btn-secondary" onClick={onStudy}>
            <BookOpen size={18} />
            <span>Study Materials</span>
          </button>
        )}
        <button className="btn btn-primary" onClick={onHome}>
          <Home size={18} />
          <span>New Video</span>
        </button>
      </div>
    </div>
  );
}
