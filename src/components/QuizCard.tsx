import { useState } from "react";
import { QuizQuestion } from "../types";
import { CheckCircle, XCircle, ChevronRight } from "lucide-react";

interface QuizCardProps {
  question: QuizQuestion;
  questionIndex: number;
  totalQuestions: number;
  onAnswer: (selectedIndex: number) => void;
  onNext: () => void;
}

export default function QuizCard({
  question,
  questionIndex,
  totalQuestions,
  onAnswer,
  onNext,
}: QuizCardProps) {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);

  const handleSelect = (index: number) => {
    if (isAnswered) return;
    setSelectedOption(index);
    setIsAnswered(true);
    onAnswer(index);
  };

  const getOptionClass = (index: number) => {
    if (!isAnswered) {
      return `quiz-option ${selectedOption === index ? "selected" : ""}`;
    }
    if (index === question.correctAnswer) return "quiz-option correct";
    if (index === selectedOption && index !== question.correctAnswer)
      return "quiz-option incorrect";
    return "quiz-option disabled";
  };

  return (
    <div className="quiz-card">
      <div className="quiz-progress">
        <div className="progress-text">
          Question {questionIndex + 1} of {totalQuestions}
        </div>
        <div className="progress-bar-track">
          <div
            className="progress-bar-fill"
            style={{
              width: `${((questionIndex + 1) / totalQuestions) * 100}%`,
            }}
          />
        </div>
      </div>

      <h2 className="quiz-question">{question.question}</h2>

      <div className="quiz-options">
        {question.options.map((option, index) => (
          <button
            key={index}
            className={getOptionClass(index)}
            onClick={() => handleSelect(index)}
            disabled={isAnswered}
          >
            <span className="option-letter">
              {String.fromCharCode(65 + index)}
            </span>
            <span className="option-text">{option}</span>
            {isAnswered && index === question.correctAnswer && (
              <CheckCircle size={20} className="option-icon correct-icon" />
            )}
            {isAnswered &&
              index === selectedOption &&
              index !== question.correctAnswer && (
                <XCircle size={20} className="option-icon incorrect-icon" />
              )}
          </button>
        ))}
      </div>

      {isAnswered && (
        <div className={`quiz-explanation ${selectedOption === question.correctAnswer ? "correct" : "incorrect"}`}>
          <div className="explanation-header">
            {selectedOption === question.correctAnswer ? (
              <><CheckCircle size={18} /> Correct!</>
            ) : (
              <><XCircle size={18} /> Incorrect</>
            )}
          </div>
          <p>{question.explanation}</p>
        </div>
      )}

      {isAnswered && (
        <button className="btn btn-primary btn-next" onClick={onNext}>
          <span>{questionIndex + 1 < totalQuestions ? "Next Question" : "See Results"}</span>
          <ChevronRight size={18} />
        </button>
      )}
    </div>
  );
}
