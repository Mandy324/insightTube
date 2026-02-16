import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import { AIProvider, AIModel, QuizQuestion, StudyMaterials, Flashcard, MindMapNode, StudyMaterialType } from "../types";

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
  count: number,
  model: string
): Promise<QuizQuestion[]> {
  const client = new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true,
  });

  const response = await client.chat.completions.create({
    model,
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
  count: number,
  model: string
): Promise<QuizQuestion[]> {
  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model,
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
  questionCount: number,
  model: string
): Promise<QuizQuestion[]> {
  if (provider === "openai") {
    return generateWithOpenAI(apiKey, transcript, questionCount, model);
  } else {
    return generateWithGemini(apiKey, transcript, questionCount, model);
  }
}

/* ---- Model Listing ---- */

const OPENAI_CHAT_PREFIXES = ["gpt-4", "gpt-3.5", "o1", "o3", "o4", "chatgpt"];

async function listOpenAIModels(apiKey: string): Promise<AIModel[]> {
  const client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
  const page = await client.models.list();
  const models: AIModel[] = [];
  for await (const m of page) {
    const id = m.id;
    if (OPENAI_CHAT_PREFIXES.some((p) => id.startsWith(p))) {
      models.push({ id, name: id, provider: "openai" });
    }
  }
  models.sort((a, b) => a.id.localeCompare(b.id));
  return models;
}

async function listGeminiModels(apiKey: string): Promise<AIModel[]> {
  const ai = new GoogleGenAI({ apiKey });
  const pager = await ai.models.list({ config: { pageSize: 100 } });
  const models: AIModel[] = [];
  for (const m of pager.page) {
    const id = m.name ?? "";
    const shortId = id.replace(/^models\//, "");
    const displayName = m.displayName ?? shortId;
    // Only include generative models (not embeddings, etc.)
    const supported = m.supportedActions ?? [];
    const canGenerate =
      supported.includes("generateContent") ||
      shortId.startsWith("gemini");
    if (canGenerate) {
      models.push({ id: shortId, name: displayName, provider: "gemini" });
    }
  }
  models.sort((a, b) => a.name.localeCompare(b.name));
  return models;
}

export async function listModels(
  provider: AIProvider,
  apiKey: string
): Promise<AIModel[]> {
  try {
    if (provider === "openai") {
      return await listOpenAIModels(apiKey);
    } else {
      return await listGeminiModels(apiKey);
    }
  } catch (err) {
    console.error(`Failed to list ${provider} models:`, err);
    return getDefaultModels(provider);
  }
}

export function getDefaultModels(provider: AIProvider): AIModel[] {
  if (provider === "openai") {
    return [
      { id: "gpt-4o", name: "gpt-4o", provider: "openai" },
      { id: "gpt-4o-mini", name: "gpt-4o-mini", provider: "openai" },
      { id: "gpt-4.1", name: "gpt-4.1", provider: "openai" },
      { id: "gpt-4.1-mini", name: "gpt-4.1-mini", provider: "openai" },
      { id: "gpt-4.1-nano", name: "gpt-4.1-nano", provider: "openai" },
      { id: "gpt-5-mini", name: "gpt-5-mini", provider: "openai" },
      { id: "o3-mini", name: "o3-mini", provider: "openai" },
    ];
  }
  return [
    { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", provider: "gemini" },
    { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", provider: "gemini" },
    { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", provider: "gemini" },
    { id: "gemini-2.0-flash-lite", name: "Gemini 2.0 Flash Lite", provider: "gemini" },
  ];
}

export function getDefaultModelForProvider(provider: AIProvider): string {
  return provider === "openai" ? "gpt-4.1-nano" : "gemini-2.5-flash";
}

/* ---- Study Material Generation ---- */

const STUDY_PROMPTS: Record<StudyMaterialType, string> = {
  summary: `You are an expert educator. Given a video transcript, create a comprehensive yet concise summary.

RULES:
- Write a clear, well-structured summary in markdown format
- Include key points, main arguments, and important details
- Use headers, bullet points, and emphasis where appropriate
- Keep it between 300-600 words
- Return ONLY the markdown summary text, no JSON wrapping`,

  mindMap: `You are an expert educator. Given a video transcript, create a hierarchical mind map.

RULES:
- Create a tree structure that captures the main topics and subtopics
- The root node should be the main topic of the video
- Each node has a "label" and optional "children" array
- Keep labels concise (3-8 words)
- Aim for 3-5 main branches with 2-4 sub-branches each
- Return ONLY valid JSON

Return JSON in this exact format:
{
  "label": "Main Topic",
  "children": [
    {
      "label": "Subtopic 1",
      "children": [
        { "label": "Detail A" },
        { "label": "Detail B" }
      ]
    }
  ]
}`,

  flashcards: `You are an expert educator. Given a video transcript, create flashcards for studying.

RULES:
- Create 10-15 flashcards covering key concepts
- Each card has a "front" (question/prompt) and "back" (answer)
- Mix different types: definitions, concepts, comparisons
- Keep answers concise but complete
- Return ONLY valid JSON

Return JSON in this exact format:
{
  "flashcards": [
    { "front": "What is X?", "back": "X is..." }
  ]
}`,

  studyGuide: `You are an expert educator. Given a video transcript, create a comprehensive study guide.

RULES:
- Create a well-structured study guide in markdown format
- Include: Learning Objectives, Key Concepts, Detailed Notes, Key Terms/Definitions, Review Questions
- Use proper markdown formatting with headers
- Make it thorough enough for exam preparation
- Return ONLY the markdown text, no JSON wrapping`,

  roadmap: `You are an expert educator. Given a video transcript, create a learning roadmap.

RULES:
- Create a step-by-step learning path in markdown format
- Include prerequisites, core topics to master, and next steps
- Suggest additional resources or topics to explore
- Use a numbered progression with clear milestones
- Return ONLY the markdown text, no JSON wrapping`,
};

function buildStudyPrompt(type: StudyMaterialType, transcript: string): string {
  const trimmed =
    transcript.length > 15000
      ? transcript.substring(0, 15000) + "... [transcript truncated]"
      : transcript;
  return `${STUDY_PROMPTS[type]}\n\nTRANSCRIPT:\n${trimmed}`;
}

async function generateContentWithOpenAI(
  apiKey: string,
  prompt: string,
  model: string,
  jsonMode: boolean
): Promise<string> {
  const client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
  const response = await client.chat.completions.create({
    model,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
  });
  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No response from OpenAI");
  return content;
}

async function generateContentWithGemini(
  apiKey: string,
  prompt: string,
  model: string,
  jsonMode: boolean
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      temperature: 0.7,
      ...(jsonMode ? { responseMimeType: "application/json" } : {}),
    },
  });
  const content = response.text;
  if (!content) throw new Error("No response from Gemini");
  return content;
}

async function generateContent(
  provider: AIProvider,
  apiKey: string,
  prompt: string,
  model: string,
  jsonMode: boolean
): Promise<string> {
  if (provider === "openai") {
    return generateContentWithOpenAI(apiKey, prompt, model, jsonMode);
  }
  return generateContentWithGemini(apiKey, prompt, model, jsonMode);
}

function cleanMarkdown(text: string): string {
  return text.replace(/^```(?:markdown|md)?\s*/m, "").replace(/```\s*$/m, "").trim();
}

export async function generateStudyMaterial(
  type: StudyMaterialType,
  provider: AIProvider,
  apiKey: string,
  transcript: string,
  model: string
): Promise<Partial<StudyMaterials>> {
  const prompt = buildStudyPrompt(type, transcript);
  const jsonMode = type === "mindMap" || type === "flashcards";
  const raw = await generateContent(provider, apiKey, prompt, model, jsonMode);

  switch (type) {
    case "summary":
      return { summary: cleanMarkdown(raw) };
    case "studyGuide":
      return { studyGuide: cleanMarkdown(raw) };
    case "roadmap":
      return { roadmap: cleanMarkdown(raw) };
    case "mindMap": {
      let jsonStr = raw.trim();
      const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (fenceMatch) jsonStr = fenceMatch[1].trim();
      const parsed = JSON.parse(jsonStr) as MindMapNode;
      return { mindMap: parsed };
    }
    case "flashcards": {
      let jsonStr = raw.trim();
      const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (fenceMatch) jsonStr = fenceMatch[1].trim();
      const parsed = JSON.parse(jsonStr);
      const cards: Flashcard[] = (parsed.flashcards || parsed).map(
        (c: Flashcard) => ({ front: c.front, back: c.back })
      );
      return { flashcards: cards };
    }
  }
}
