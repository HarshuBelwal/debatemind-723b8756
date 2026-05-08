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
  strengths?: string[];
  weaknesses?: string[];
  improvements?: string[];
  winner?: "user" | "ai" | "tie";
}

export interface ArgumentScores {
  logic: number;
  evidence: number;
  emotional: number;
  clarity: number;
  confidence: number;
}

export interface FactCheck {
  status: "verified" | "misleading" | "unverifiable";
  note: string;
}

export interface DebateAnalysis {
  on_topic: boolean;
  off_topic_reason?: string;
  scores: ArgumentScores;
  fact_check: FactCheck;
}

export interface ArgumentAnalysis {
  score: number; // 0-100
  strengths: string[];
  weaknesses: string[];
  improvement: string;
}
