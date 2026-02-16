import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import { AIProvider, QuizQuestion } from "../types";

const QUIZ_SYSTEM_PROMPT = `You are an expert educator. Given a video transcript, generate a quiz to test comprehension.

RULES:
- Generate exactly {count} multiple-choice questions
- Each question must have exactly 4 options
- Questions should test understanding, not just memory
- Include a mix of difficulty levels
- Provide clear, educational explanations for each answer
- Return ONLY valid JSON, no markdown or extra text

Return JSON in this exact format:
{
  "questions": [
    {
      "question": "What is the main concept discussed?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Option A is correct because..."
    }
  ]
}`;

function buildPrompt(transcript: string, count: number): string {
  const systemPrompt = QUIZ_SYSTEM_PROMPT.replace("{count}", String(count));
  const trimmed =
    transcript.length > 15000
      ? transcript.substring(0, 15000) + "... [transcript truncated]"
      : transcript;
  return `${systemPrompt}\n\nTRANSCRIPT:\n${trimmed}`;
}

function parseQuizResponse(text: string): QuizQuestion[] {
  // Try to extract JSON from the response
  let jsonStr = text.trim();

  // Remove markdown code fences if present
  const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    jsonStr = fenceMatch[1].trim();
  }

  const parsed = JSON.parse(jsonStr);
  const questions: QuizQuestion[] = (parsed.questions || parsed).map(
    (q: QuizQuestion, i: number) => ({
      id: i + 1,
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
    })
  );

  return questions;
}

async function generateWithOpenAI(
  apiKey: string,
  transcript: string,
  count: number
): Promise<QuizQuestion[]> {
  const client = new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true,
  });

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: buildPrompt(transcript, count),
      },
    ],
    temperature: 0.7,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No response from OpenAI");

  return parseQuizResponse(content);
}

async function generateWithGemini(
  apiKey: string,
  transcript: string,
  count: number
): Promise<QuizQuestion[]> {
  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: buildPrompt(transcript, count),
    config: {
      temperature: 0.7,
      responseMimeType: "application/json",
    },
  });

  const content = response.text;
  if (!content) throw new Error("No response from Gemini");

  return parseQuizResponse(content);
}

export async function generateQuiz(
  provider: AIProvider,
  apiKey: string,
  transcript: string,
  questionCount: number
): Promise<QuizQuestion[]> {
  if (provider === "openai") {
    return generateWithOpenAI(apiKey, transcript, questionCount);
  } else {
    return generateWithGemini(apiKey, transcript, questionCount);
  }
}
