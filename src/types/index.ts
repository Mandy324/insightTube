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
  completedAt: string; // ISO string for serialization
}

export type AIProvider = "openai" | "gemini";

export interface AIModel {
  id: string;
  name: string;
  provider: AIProvider;
}

/* ---- Study Material Types ---- */

export interface Flashcard {
  front: string;
  back: string;
}

export interface MindMapNode {
  label: string;
  children?: MindMapNode[];
}

export interface StudyMaterials {
  summary: string;
  mindMap: MindMapNode;
  flashcards: Flashcard[];
  studyGuide: string;
  roadmap: string;
}

export type StudyMaterialType = "summary" | "mindMap" | "flashcards" | "studyGuide" | "roadmap";

/* ---- Video Session ---- */

export interface VideoSession {
  id: string;
  videoId: string;
  videoUrl: string;
  videoTitle: string;
  thumbnailUrl: string;
  transcript: string;
  createdAt: string; // ISO string
  quizResults: QuizResult[];
  studyMaterials?: Partial<StudyMaterials>;
  latestQuiz?: Quiz;
}

export interface VideoInfo {
  title: string;
  author: string;
}

/* ---- Settings ---- */

export interface AppSettings {
  openaiApiKey: string;
  geminiApiKey: string;
  selectedProvider: AIProvider;
  selectedModel: string;
  openaiModel: string;
  geminiModel: string;
  questionCount: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  openaiApiKey: "",
  geminiApiKey: "",
  selectedProvider: "gemini",
  selectedModel: "gemini-2.5-flash",
  openaiModel: "gpt-4.1-nano",
  geminiModel: "gemini-2.5-flash",
  questionCount: 10,
};
