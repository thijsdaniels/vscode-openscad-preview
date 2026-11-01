import { en, MessageKey } from "./en";
import { fr } from "./fr";

export type { MessageKey };

const locales: Record<string, Record<MessageKey, string>> = { en, fr };

/**
 * The extension writes VS Code's display language into `<html lang>`.
 * Only the primary subtag is used ("fr-CA" → "fr"); unknown → English.
 */
const language = document.documentElement.lang.split("-")[0].toLowerCase();
const messages = locales[language] ?? en;

/** Translates `key`, replacing `{0}`, `{1}`… with `args`. */
export function t(key: MessageKey, ...args: (string | number)[]): string {
  const text: string = messages[key] ?? en[key];
  return text.replace(/\{(\d+)\}/g, (match, index: string) =>
    index in args ? String(args[Number(index)]) : match,
  );
}
