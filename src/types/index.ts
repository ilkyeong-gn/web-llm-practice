export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ProgressReport {
  progress: number;
  text: string;
}
