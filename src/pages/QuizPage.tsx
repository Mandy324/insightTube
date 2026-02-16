import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import QuizCard from "../components/QuizCard";
import { Quiz, QuizResult } from "../types";

export default function QuizPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const quiz = location.state?.quiz as Quiz | undefined;
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);

  if (!quiz) {
    return (
      <div className="page quiz-page">
        <div className="empty-state">
          <h2>No Quiz Loaded</h2>
          <p>Go back to the home page and generate a quiz first.</p>
          <button className="btn btn-primary" onClick={() => navigate("/")}>
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const handleAnswer = (selectedIndex: number) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[currentQuestion] = selectedIndex;
      return next;
    });
  };

  const handleNext = () => {
    if (currentQuestion + 1 < quiz.questions.length) {
      setCurrentQuestion((prev) => prev + 1);
    } else {
      // Calculate score and go to results
      const finalAnswers = [...answers];
      finalAnswers[currentQuestion] =
        finalAnswers[currentQuestion] ?? null;

      const score = quiz.questions.reduce((acc, q, i) => {
        return acc + (finalAnswers[i] === q.correctAnswer ? 1 : 0);
      }, 0);

      const result: QuizResult = {
        quiz,
        answers: finalAnswers,
        score,
        totalQuestions: quiz.questions.length,
        completedAt: new Date(),
      };

      navigate("/results", { state: { result } });
    }
  };

  return (
    <div className="page quiz-page">
      <QuizCard
        key={currentQuestion}
        question={quiz.questions[currentQuestion]}
        questionIndex={currentQuestion}
        totalQuestions={quiz.questions.length}
        onAnswer={handleAnswer}
        onNext={handleNext}
      />
    </div>
  );
}
