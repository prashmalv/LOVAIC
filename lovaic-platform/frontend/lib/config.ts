export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

export type Portal = "gov" | "enterprise";

// Detection "modes" understood by the backend YOLOv8 engine.
export type DetectMode =
  | "general"
  | "garbage"
  | "traffic"
  | "queue"
  | "safety"
  | "retail"
  | "ppe";
