export type DebateSide = "for" | "against" | "devil";

export interface DebateMessage {
  role: "user" | "ai" | "system";
  content: string;
  ts: number;
}

export interface QuizQuestion {
  question: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
}

export interface DebateJudgment {
  verdict: string;
  user_strength: number; // 0-100
  ai_strength: number;
  score_awarded: number; // 0-100
  highlights: string[];
}

export interface ArgumentAnalysis {
  score: number; // 0-100
  strengths: string[];
  weaknesses: string[];
  improvement: string;
}
