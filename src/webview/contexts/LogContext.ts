import { createContext } from "@lit/context";

export interface LogMessage {
  id: string;
  level: "info" | "warning" | "error";
  text: string;
  traces: string[];
}

export interface LogContext {
  logs: LogMessage[];
  autoClear: boolean;
  clear: () => void;
  toggleAutoClear: () => void;
}

export const logContext = createContext<LogContext>("log-context");
