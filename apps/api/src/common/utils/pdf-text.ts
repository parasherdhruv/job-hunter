import { inflateSync } from 'node:zlib';

/**
 * Best-effort plain-text extraction from a PDF buffer.
 *
 * Many PDFs store page content as FlateDecode streams containing text-showing
 * operators (`Tj`, `TJ`). We inflate those streams and pull out the literal
 * strings. This is intentionally dependency-free and lossy: it will not handle
 * every producer or encoding, and returns an empty string when it cannot read
 * anything. Callers must treat the result as optional enrichment.
 */
export function extractPdfText(buffer: Buffer): string {
  const chunks: string[] = [];
  const latin = buffer.toString('latin1');
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;

  let match: RegExpExecArray | null;
  while ((match = streamRegex.exec(latin)) !== null) {
    const raw = Buffer.from(match[1], 'latin1');
    let content: string;
    try {
      content = inflateSync(raw).toString('latin1');
    } catch {
      content = raw.toString('latin1');
    }
    chunks.push(extractTextOperators(content));
  }

  return normalizeWhitespace(chunks.join(' '));
}

function extractTextOperators(content: string): string {
  const parts: string[] = [];
  const showRegex = /\((?:\\.|[^\\()])*\)\s*Tj|\[((?:[^\][]|\\.)*)\]\s*TJ/g;

  let match: RegExpExecArray | null;
  while ((match = showRegex.exec(content)) !== null) {
    const raw = match[0];
    if (raw.includes('TJ')) {
      const arrayMatch = /\[((?:[^\][]|\\.)*)\]/.exec(raw);
      if (!arrayMatch) continue;
      const literals = arrayMatch[1].match(/\((?:\\.|[^\\()])*\)/g) ?? [];
      parts.push(literals.map(unescapePdfString).join(''));
    } else {
      parts.push(unescapePdfString(raw.replace(/\s*Tj$/, '')));
    }
  }
  return parts.join(' ');
}

function unescapePdfString(value: string): string {
  return value
    .replace(/^\(|\)$/g, '')
    .replace(/\\([nrtbf()\\])/g, (_full, char: string) => {
      const map: Record<string, string> = {
        n: '\n',
        r: '\r',
        t: '\t',
        b: '\b',
        f: '\f',
        '(': '(',
        ')': ')',
        '\\': '\\',
      };
      return map[char] ?? char;
    })
    .replace(/\\(\d{1,3})/g, (_full, octal: string) =>
      String.fromCharCode(Number.parseInt(octal, 8)),
    );
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}
