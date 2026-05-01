export type Attr = {
  name: string
  value?: string
}

type ReadResult = {
  value: string
  nextIndex: number
}

type ObjectProperty = {
  key: string
  value?: string
}

const attrNameStartPattern = /[:@#A-Za-z_]/;
const attrNamePattern = /[\w:.-]/;

export function convertAttrsToObject(input: string) {
  const attrs = parseAttrs(input);

  if (!attrs.length) {
    return null;
  }

  return attrsToObject(attrs);
}

export function convertSelection(input: string) {
  return convertObjectToAttrs(input) ?? convertAttrsToObject(input);
}

export function convertObjectToAttrs(input: string) {
  const properties = parseObjectLiteral(input);

  if (!properties?.length) {
    return null;
  }

  return properties.map(formatObjectPropertyAsAttr).join('\n');
}

export function parseAttrs(input: string) {
  const attrs: Attr[] = [];
  let index = 0;

  while (index < input.length) {
    index = skipIgnorable(input, index);

    if (index >= input.length) {
      break;
    }

    if (input[index] === '<') {
      index = skipTagName(input, index + 1);
      continue;
    }

    if (!isAttrNameStart(input[index])) {
      index += 1;
      continue;
    }

    const nameStart = index;
    index += 1;

    while (index < input.length && attrNamePattern.test(input[index])) {
      index += 1;
    }

    const name = input.slice(nameStart, index);
    const afterName = skipWhitespace(input, index);
    const nextChar = input[afterName];

    // `foo: "bar"` is an object literal, not a Vue/HTML attribute.
    if (nextChar === ':') {
      index = afterName + 1;
      continue;
    }

    if (nextChar !== '=') {
      attrs.push({ name });
      index = afterName;
      continue;
    }

    const valueStart = skipWhitespace(input, afterName + 1);
    const { value, nextIndex } = readAttrValue(input, valueStart);

    attrs.push({ name, value });
    index = nextIndex;
  }

  return attrs;
}

export function attrsToObject(attrs: Attr[]) {
  const lines = attrs.map(({ name, value }) => {
    const isBound = isBoundAttribute(name);
    const key = normalizeKey(name);
    const objectKey = toObjectKey(key);
    const objectValue = toObjectValue(value, isBound);

    return formatProperty(objectKey, objectValue);
  });

  return `{\n${lines.join('\n')}\n}`;
}

function parseObjectLiteral(input: string) {
  const trimmed = trimTrailingSemicolon(input.trim());

  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
    return null;
  }

  const content = trimmed.slice(1, -1);
  const properties: ObjectProperty[] = [];

  for (const segment of splitTopLevel(content, ',')) {
    const property = parseObjectProperty(segment);

    if (property === 'skip') {
      continue;
    }

    if (!property) {
      return null;
    }

    properties.push(property);
  }

  return properties;
}

function parseObjectProperty(segment: string) {
  const trimmed = segment.trim();

  if (!trimmed) {
    return 'skip' as const;
  }

  if (trimmed.startsWith('...')) {
    return null;
  }

  const colonIndex = findTopLevelChar(trimmed, ':');

  if (colonIndex === -1) {
    if (!isIdentifier(trimmed)) {
      return null;
    }

    return {
      key: trimmed,
      value: trimmed,
    };
  }

  const key = parseObjectKey(trimmed.slice(0, colonIndex).trim());
  const value = trimmed.slice(colonIndex + 1).trim();

  if (!key || !value) {
    return null;
  }

  return {
    key,
    value,
  };
}

function parseObjectKey(source: string) {
  if (isIdentifier(source)) {
    return source;
  }

  return parseStringLiteralValue(source);
}

function formatObjectPropertyAsAttr(property: ObjectProperty) {
  const attrName = normalizeAttrName(property.key);
  const value = property.value;

  if (value === undefined || value === 'true') {
    return attrName;
  }

  const staticValue = parseStringLiteralValue(value);

  if (staticValue !== null) {
    return `${attrName}=${quoteAttributeValue(staticValue)}`;
  }

  const boundName = isDirectiveAttribute(attrName) ? attrName : `:${attrName}`;
  const expression = normalizeExpressionIndentation(value.trim());

  return `${boundName}=${quoteAttributeValue(expression)}`;
}

function skipIgnorable(input: string, index: number) {
  while (index < input.length) {
    const char = input[index];

    if (isWhitespace(char) || char === '>' || char === '/' || char === ',') {
      index += 1;
      continue;
    }

    break;
  }

  return index;
}

function skipTagName(input: string, index: number) {
  while (index < input.length) {
    const char = input[index];

    if (isWhitespace(char) || char === '>' || char === '/') {
      break;
    }

    index += 1;
  }

  return index;
}

function skipWhitespace(input: string, index: number) {
  while (index < input.length && isWhitespace(input[index])) {
    index += 1;
  }

  return index;
}

function isWhitespace(char: string | undefined) {
  return !!char && /\s/.test(char);
}

function isAttrNameStart(char: string | undefined) {
  return !!char && attrNameStartPattern.test(char);
}

function readAttrValue(input: string, index: number): ReadResult {
  const startChar = input[index];

  if (!startChar) {
    return { value: '', nextIndex: index };
  }

  if (isQuote(startChar)) {
    return readQuotedValue(input, index, startChar);
  }

  if (isOpeningBracket(startChar)) {
    return readBalancedValue(input, index);
  }

  let nextIndex = index;

  while (nextIndex < input.length) {
    const char = input[nextIndex];

    if (isWhitespace(char) || char === '>' || char === '/') {
      break;
    }

    nextIndex += 1;
  }

  return {
    value: input.slice(index, nextIndex),
    nextIndex,
  };
}

function readQuotedValue(input: string, index: number, quote: string): ReadResult {
  let nextIndex = index + 1;

  while (nextIndex < input.length) {
    const char = input[nextIndex];

    if (char === '\\') {
      nextIndex += 2;
      continue;
    }

    if (char === quote) {
      return {
        value: input.slice(index + 1, nextIndex),
        nextIndex: nextIndex + 1,
      };
    }

    nextIndex += 1;
  }

  return {
    value: input.slice(index + 1),
    nextIndex: input.length,
  };
}

function readBalancedValue(input: string, index: number): ReadResult {
  const openingBracket = input[index] as '{' | '[' | '(';
  const stack = [getClosingBracket(openingBracket)];
  let nextIndex = index + 1;

  while (nextIndex < input.length && stack.length) {
    const char = input[nextIndex];

    if (isQuote(char)) {
      nextIndex = readQuotedValue(input, nextIndex, char).nextIndex;
      continue;
    }

    if (isOpeningBracket(char)) {
      stack.push(getClosingBracket(char));
      nextIndex += 1;
      continue;
    }

    if (char === stack[stack.length - 1]) {
      stack.pop();
      nextIndex += 1;
      continue;
    }

    nextIndex += 1;
  }

  return {
    value: input.slice(index, nextIndex),
    nextIndex,
  };
}

function isQuote(char: string | undefined): char is '"' | '\'' | '`' {
  return char === '"' || char === '\'' || char === '`';
}

function isOpeningBracket(char: string | undefined): char is '{' | '[' | '(' {
  return char === '{' || char === '[' || char === '(';
}

function getClosingBracket(char: '{' | '[' | '(') {
  switch (char) {
    case '{':
      return '}';
    case '[':
      return ']';
    default:
      return ')';
  }
}

function isBoundAttribute(name: string) {
  return name.startsWith(':') || name.startsWith('v-bind:');
}

function normalizeKey(name: string) {
  if (name.startsWith('v-bind:')) {
    return toPropKey(name.slice('v-bind:'.length));
  }

  if (name.startsWith(':')) {
    return toPropKey(name.slice(1));
  }

  if (name === 'v-model') {
    return 'modelValue';
  }

  if (name.startsWith('v-model:')) {
    return toPropKey(name.slice('v-model:'.length));
  }

  if (name.startsWith('@') || name.startsWith('#') || name.startsWith('v-')) {
    return name;
  }

  return toPropKey(name);
}

function normalizeAttrName(name: string) {
  if (name === 'modelValue') {
    return 'v-model';
  }

  if (isDirectiveAttribute(name)) {
    return name;
  }

  return toKebabCase(name);
}

function toPropKey(name: string) {
  return name.replace(/-([A-Za-z0-9])/g, (_, char: string) => char.toUpperCase());
}

function toKebabCase(name: string) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .replace(/_/g, '-')
    .toLowerCase();
}

function toObjectKey(key: string) {
  return /^[A-Za-z_$][\w$]*$/.test(key) ? key : `"${escapeDoubleQuotes(key)}"`;
}

function toObjectValue(value: string | undefined, isBound: boolean) {
  if (value === undefined) {
    return 'true';
  }

  const normalizedValue = value.replace(/\r\n?/g, '\n');
  const trimmed = normalizedValue.trim();

  if (isBound) {
    return normalizeBoundExpression(trimmed) || 'true';
  }

  return `'${escapeSingleQuotes(normalizedValue)}'`;
}

function formatProperty(key: string, value: string) {
  const lines = value.split('\n');

  if (lines.length === 1) {
    return `  ${key}: ${value},`;
  }

  const formatted = [
    `  ${key}: ${lines[0]}`,
    ...lines.slice(1).map(line => line ? `  ${line}` : ''),
  ];

  formatted[formatted.length - 1] += ',';

  return formatted.join('\n');
}

function normalizeExpressionIndentation(value: string) {
  const lines = value.split('\n');

  if (lines.length === 1) {
    return value;
  }

  const indents = lines
    .slice(1)
    .filter(line => line.trim())
    .map(line => line.match(/^\s*/)?.[0].length ?? 0);

  const commonIndent = indents.length ? Math.min(...indents) : 0;

  if (!commonIndent) {
    return value;
  }

  return [
    lines[0],
    ...lines.slice(1).map(line => line.slice(commonIndent)),
  ].join('\n');
}

function normalizeBoundExpression(value: string) {
  return convertDoubleQuotedStringsToSingle(normalizeExpressionIndentation(value));
}

function convertDoubleQuotedStringsToSingle(value: string) {
  let result = '';
  let index = 0;

  while (index < value.length) {
    const char = value[index];

    if (char !== '"') {
      result += char;
      index += 1;
      continue;
    }

    const parsed = readDoubleQuotedStringLiteral(value, index);

    if (!parsed) {
      result += char;
      index += 1;
      continue;
    }

    result += quoteJsStringWithSingleQuotes(parsed.value);
    index = parsed.nextIndex;
  }

  return result;
}

function readDoubleQuotedStringLiteral(input: string, index: number) {
  let value = '';
  let nextIndex = index + 1;

  while (nextIndex < input.length) {
    const char = input[nextIndex];

    if (char === '"') {
      return {
        value,
        nextIndex: nextIndex + 1,
      };
    }

    if (char !== '\\') {
      value += char;
      nextIndex += 1;
      continue;
    }

    const escape = input[nextIndex + 1];

    if (!escape) {
      return null;
    }

    value += `\\${escape}`;
    nextIndex += 2;
  }

  return null;
}

function quoteJsStringWithSingleQuotes(value: string) {
  return `'${value
    .replace(/\\'/g, '\'')
    .replace(/'/g, "\\'")
    .replace(/(?<!\\)"/g, '"')
    .replace(/\\"/g, '"')}'`;
}

function splitTopLevel(input: string, delimiter: string) {
  const segments: string[] = [];
  let start = 0;
  let index = 0;

  while (index < input.length) {
    const char = input[index];

    if (isQuote(char)) {
      index = readQuotedValue(input, index, char).nextIndex;
      continue;
    }

    if (isOpeningBracket(char)) {
      index = readBalancedValue(input, index).nextIndex;
      continue;
    }

    if (char === delimiter) {
      segments.push(input.slice(start, index));
      start = index + 1;
    }

    index += 1;
  }

  segments.push(input.slice(start));

  return segments;
}

function findTopLevelChar(input: string, delimiter: string) {
  let index = 0;

  while (index < input.length) {
    const char = input[index];

    if (isQuote(char)) {
      index = readQuotedValue(input, index, char).nextIndex;
      continue;
    }

    if (isOpeningBracket(char)) {
      index = readBalancedValue(input, index).nextIndex;
      continue;
    }

    if (char === delimiter) {
      return index;
    }

    index += 1;
  }

  return -1;
}

function isIdentifier(value: string) {
  return /^[A-Za-z_$][\w$]*$/.test(value);
}

function isDirectiveAttribute(name: string) {
  return name.startsWith(':') || name.startsWith('v-') || name.startsWith('@') || name.startsWith('#');
}

function parseStringLiteralValue(source: string) {
  const trimmed = source.trim();

  if (trimmed.length < 2) {
    return null;
  }

  const quote = trimmed[0];
  const endQuote = trimmed[trimmed.length - 1];

  if (!isQuote(quote) || endQuote !== quote) {
    return null;
  }

  if (quote === '`' && trimmed.includes('${')) {
    return null;
  }

  let result = '';

  for (let index = 1; index < trimmed.length - 1; index += 1) {
    const char = trimmed[index];

    if (char !== '\\') {
      result += char;
      continue;
    }

    index += 1;

    if (index >= trimmed.length - 1) {
      return null;
    }

    const escape = trimmed[index];

    switch (escape) {
      case '\\':
      case '\'':
      case '"':
      case '`':
        result += escape;
        break;
      case 'n':
        result += '\n';
        break;
      case 'r':
        result += '\r';
        break;
      case 't':
        result += '\t';
        break;
      case 'b':
        result += '\b';
        break;
      case 'f':
        result += '\f';
        break;
      case 'v':
        result += '\v';
        break;
      case '0':
        result += '\0';
        break;
      case 'x': {
        const hex = trimmed.slice(index + 1, index + 3);

        if (!/^[\da-fA-F]{2}$/.test(hex)) {
          return null;
        }

        result += String.fromCharCode(Number.parseInt(hex, 16));
        index += 2;
        break;
      }
      case 'u': {
        if (trimmed[index + 1] === '{') {
          const endIndex = trimmed.indexOf('}', index + 2);

          if (endIndex === -1) {
            return null;
          }

          const codePoint = trimmed.slice(index + 2, endIndex);

          if (!/^[\da-fA-F]+$/.test(codePoint)) {
            return null;
          }

          result += String.fromCodePoint(Number.parseInt(codePoint, 16));
          index = endIndex;
          break;
        }

        const hex = trimmed.slice(index + 1, index + 5);

        if (!/^[\da-fA-F]{4}$/.test(hex)) {
          return null;
        }

        result += String.fromCharCode(Number.parseInt(hex, 16));
        index += 4;
        break;
      }
      case '\n':
        break;
      default:
        result += escape;
        break;
    }
  }

  return result;
}

function quoteAttributeValue(value: string) {
  const quote = chooseAttributeQuote(value);
  const escapedValue = escapeAttributeValue(value, quote);

  return `${quote}${escapedValue}${quote}`;
}

function chooseAttributeQuote(value: string): '"' | '\'' {
  const doubleQuotes = countOccurrences(value, '"');
  const singleQuotes = countOccurrences(value, '\'');

  return doubleQuotes <= singleQuotes ? '"' : '\'';
}

function countOccurrences(value: string, search: string) {
  return value.split(search).length - 1;
}

function escapeAttributeValue(value: string, quote: '"' | '\'') {
  const escapedValue = value.replace(/&/g, '&amp;');

  if (quote === '"') {
    return escapedValue.replace(/"/g, '&quot;');
  }

  return escapedValue.replace(/'/g, '&#39;');
}

function trimTrailingSemicolon(value: string) {
  if (!value.endsWith(';')) {
    return value;
  }

  return value.slice(0, -1).trimEnd();
}

function escapeDoubleQuotes(value: string) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t');
}

function escapeSingleQuotes(value: string) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t');
}
