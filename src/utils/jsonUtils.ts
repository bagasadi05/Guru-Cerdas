/**
 * @fileoverview Robust JSON extraction and repair utility for AI responses.
 *
 * Handles common LLM JSON syntax issues:
 * 1. Markdown code blocks (```json ... ```)
 * 2. Unescaped control characters/newlines inside string literals
 * 3. Trailing commas before } or ]
 * 4. Single-line and multi-line comments
 * 5. Smart / curly quotes (“ ” ‘ ’)
 * 6. Fallback regex extraction for simple key-value objects and arrays
 */

/**
 * Escapes unescaped newlines, tabs, and carriage returns inside double-quoted string literals.
 */
function fixJsonStringNewlines(jsonStr: string): string {
  let inString = false;
  let isEscaped = false;
  let result = '';

  for (let i = 0; i < jsonStr.length; i++) {
    const char = jsonStr[i];

    if (char === '"' && !isEscaped) {
      inString = !inString;
      result += char;
    } else if (inString) {
      if (char === '\\') {
        isEscaped = !isEscaped;
        result += char;
      } else {
        if (char === '\n') {
          result += '\\n';
        } else if (char === '\r') {
          result += '\\r';
        } else if (char === '\t') {
          result += '\\t';
        } else {
          result += char;
        }
        isEscaped = false;
      }
    } else {
      result += char;
      isEscaped = false;
    }
  }

  return result;
}

/**
 * Parses JSON from an LLM response string with multiple levels of error recovery.
 */
export function robustParseJson<T = any>(rawContent: string): T {
  if (!rawContent || typeof rawContent !== 'string') {
    throw new SyntaxError('Empty or invalid content for JSON parsing');
  }

  // 1. Strip markdown fences and normalize smart quotes
  let content = rawContent
    .replace(/```(?:json)?\s*/gi, '')
    .replace(/```\s*/g, '')
    .replace(/[\u201C\u201D]/g, '"') // smart double quotes
    .replace(/[\u2018\u2019]/g, "'") // smart single quotes
    .trim();

  // 2. Find outermost JSON boundary
  const firstBrace = content.indexOf('{');
  const firstBracket = content.indexOf('[');

  let start = -1;
  let end = -1;

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    start = firstBrace;
    end = content.lastIndexOf('}');
  } else if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
    start = firstBracket;
    end = content.lastIndexOf(']');
  }

  if (start !== -1 && end !== -1 && end > start) {
    content = content.substring(start, end + 1);
  }

  // Attempt 1: Direct JSON.parse
  try {
    return JSON.parse(content) as T;
  } catch {
    // Proceed to repair
  }

  // Attempt 2: Sanitized JSON.parse (fix comments, trailing commas, newlines in strings)
  try {
    let sanitized = content
      .replace(/\/\/[^\n\r]*/g, '') // remove line comments
      .replace(/\/\*[\s\S]*?\*\//g, '') // remove block comments
      .replace(/,\s*([\}\]])/g, '$1'); // remove trailing commas

    sanitized = fixJsonStringNewlines(sanitized);

    return JSON.parse(sanitized) as T;
  } catch {
    // Proceed to regex fallback
  }

  // Attempt 3: Regex-based extraction for single key or structured objects
  // 3a. String value extraction: {"key": "multi-line value"}
  const stringMatch = content.match(/"([^"\\]+)"\s*:\s*"([\s\S]*?)"(?:\s*\}|\s*,|\s*$|\s*\n)/);
  if (stringMatch) {
    const key = stringMatch[1];
    const val = stringMatch[2].replace(/\\"/g, '"').replace(/\\n/g, '\n');
    return { [key]: val } as unknown as T;
  }

  // 3b. Array value extraction: {"key": ["item 1", "item 2"]}
  const arrayMatch = content.match(/"([^"\\]+)"\s*:\s*\[([\s\S]*?)\]/);
  if (arrayMatch) {
    const key = arrayMatch[1];
    const rawItems = arrayMatch[2];
    const items = [...rawItems.matchAll(/"([^"\\]*(?:\\.[^"\\]*)*)"/g)].map(m =>
      m[1].replace(/\\"/g, '"').replace(/\\n/g, '\n')
    );
    if (items.length > 0) {
      return { [key]: items } as unknown as T;
    }
  }

  throw new SyntaxError(`Failed to parse AI JSON response: ${content.substring(0, 200)}...`);
}
