export interface TranscriptSegment {
  text: string;
  duration: number;
  offset: number;
  lang: string;
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number; // index into options
  explanation: string;
}

export interface Quiz {
  videoTitle: string;
  videoUrl: string;
  questions: QuizQuestion[];
}

export interface QuizResult {
  quiz: Quiz;
  answers: (number | null)[];
  score: number;
  totalQuestions: number;
  completedAt: Date;
}

export type AIProvider = "openai" | "gemini";

export interface AppSettings {
  openaiApiKey: string;
  geminiApiKey: string;
  selectedProvider: AIProvider;
  questionCount: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  openaiApiKey: "",
  geminiApiKey: "",
  selectedProvider: "gemini",
  questionCount: 10,
};
