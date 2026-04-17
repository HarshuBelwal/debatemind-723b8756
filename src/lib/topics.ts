export type TopicCategory = "Ethics" | "Tech" | "Society" | "Philosophy";

export interface Topic {
  id: string;
  emoji: string;
  title: string;
  category: TopicCategory;
}

export const TOPICS: Topic[] = [
  { id: "ai-jobs",        emoji: "🤖", title: "AI will replace most human jobs in 20 years", category: "Tech" },
  { id: "nuclear",        emoji: "🌿", title: "Nuclear energy is the best solution for climate change", category: "Society" },
  { id: "social-media",   emoji: "📱", title: "Social media does more harm than good", category: "Society" },
  { id: "ubi",            emoji: "⚖️", title: "Universal Basic Income should be implemented globally", category: "Society" },
  { id: "genetic-eng",    emoji: "🧬", title: "Human genetic engineering is ethical for disease prevention", category: "Ethics" },
  { id: "privacy",        emoji: "🔓", title: "Privacy is more important than national security", category: "Ethics" },
  { id: "open-ai",        emoji: "🌐", title: "Open-source AI models are safer than closed ones", category: "Tech" },
  { id: "universities",   emoji: "📚", title: "Universities are becoming obsolete", category: "Society" },
  { id: "free-will",      emoji: "🧠", title: "Free will is an illusion", category: "Philosophy" },
  { id: "meat",           emoji: "🥩", title: "Eating meat is morally indefensible", category: "Ethics" },
  { id: "space",          emoji: "🚀", title: "Colonizing Mars is a waste of resources", category: "Society" },
  { id: "consciousness",  emoji: "✨", title: "Consciousness can emerge from machines", category: "Philosophy" },
];

export const QUIZ_CATEGORIES = [
  { id: "general",    label: "General",    emoji: "🌍" },
  { id: "science",    label: "Science",    emoji: "🔬" },
  { id: "history",    label: "History",    emoji: "📜" },
  { id: "logic",      label: "Logic",      emoji: "♟️" },
  { id: "philosophy", label: "Philosophy", emoji: "🧩" },
] as const;

export type QuizCategoryId = (typeof QUIZ_CATEGORIES)[number]["id"];
