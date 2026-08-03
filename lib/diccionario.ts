export type DiccionarioSense = {
  n: number;
  category: string;
  description: string;
};

export type DiccionarioResult = {
  word: string;
  senses: DiccionarioSense[];
};

/** Quita puntuación de bordes y normaliza para consulta RAE. */
export function normalizePalabraConsulta(raw: string): string | null {
  const cleaned = raw
    .normalize("NFC")
    .trim()
    .toLowerCase()
    .replace(/^[^\p{L}\p{M}']+|[^\p{L}\p{M}']+$/gu, "");
  if (!cleaned || cleaned.length > 40) return null;
  if (!/^[\p{L}\p{M}']+$/u.test(cleaned)) return null;
  return cleaned;
}

/** Partes de texto: palabra consultable o fragmento (espacios/puntuación). */
export type TextToken =
  | { type: "word"; text: string; query: string }
  | { type: "other"; text: string };

const TOKEN_RE = /([\p{L}\p{M}']+)/gu;

export function tokenizeClickableText(texto: string): TextToken[] {
  const tokens: TextToken[] = [];
  let last = 0;
  for (const match of texto.matchAll(TOKEN_RE)) {
    const index = match.index ?? 0;
    if (index > last) {
      tokens.push({ type: "other", text: texto.slice(last, index) });
    }
    const text = match[1] ?? "";
    const query = normalizePalabraConsulta(text);
    if (query) {
      tokens.push({ type: "word", text, query });
    } else {
      tokens.push({ type: "other", text });
    }
    last = index + text.length;
  }
  if (last < texto.length) {
    tokens.push({ type: "other", text: texto.slice(last) });
  }
  return tokens;
}

const CATEGORY_ES: Record<string, string> = {
  adjective: "adj.",
  adverb: "adv.",
  noun: "s.",
  verb: "v.",
  preposition: "prep.",
  conjunction: "conj.",
  interjection: "interj.",
  pronoun: "pron.",
  article: "art.",
};

export function categoryLabel(category: string): string {
  if (!category) return "";
  return CATEGORY_ES[category] ?? category;
}
