type StringLiteral = {
  value: string
  nextIndex: number
}

export function convertClassSelection(input: string) {
  return convertClassBindingToStatic(input) ?? convertStaticClassToCn(input);
}

export function convertStaticClassToCn(input: string) {
  const parsed = parseAttribute(input, 'class');

  if (!parsed) {
    return null;
  }

  return `:class="cn('${escapeSingleQuotedJsString(parsed.value)}')"`;
}

export function convertClassBindingToStatic(input: string) {
  const parsed = parseAttribute(input, ':class');

  if (!parsed) {
    return null;
  }

  const firstClassString = getFirstClassString(parsed.value);

  if (firstClassString === null) {
    return null;
  }

  return `class="${escapeDoubleQuotedAttribute(firstClassString)}"`;
}

function parseAttribute(input: string, name: string) {
  const trimmed = input.trim();
  const nameEnd = skipWhitespace(trimmed, name.length);

  if (!trimmed.startsWith(name) || trimmed[nameEnd] !== '=') {
    return null;
  }

  const valueStart = skipWhitespace(trimmed, nameEnd + 1);
  const quote = trimmed[valueStart];

  if (quote !== '"' && quote !== '\'') {
    return null;
  }

  const parsed = readStringLiteral(trimmed, valueStart, quote);

  if (!parsed || trimmed.slice(parsed.nextIndex).trim()) {
    return null;
  }

  return {
    value: parsed.value,
  };
}

function getFirstClassString(expression: string) {
  const trimmed = expression.trim();
  const directString = readStringLiteral(trimmed, 0, trimmed[0]);

  if (directString && !trimmed.slice(directString.nextIndex).trim()) {
    return directString.value;
  }

  const callStart = trimmed.indexOf('(');

  if (callStart === -1 || !trimmed.endsWith(')')) {
    return null;
  }

  const functionName = trimmed.slice(0, callStart).trim();

  if (!/^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*$/.test(functionName)) {
    return null;
  }

  const firstArgumentStart = skipWhitespace(trimmed, callStart + 1);
  const firstArgumentQuote = trimmed[firstArgumentStart];

  if (firstArgumentQuote !== '"' && firstArgumentQuote !== '\'' && firstArgumentQuote !== '`') {
    return null;
  }

  const firstArgument = readStringLiteral(trimmed, firstArgumentStart, firstArgumentQuote);

  if (!firstArgument) {
    return null;
  }

  return firstArgument.value;
}

function readStringLiteral(input: string, index: number, quote: string | undefined): StringLiteral | null {
  if (quote !== '"' && quote !== '\'' && quote !== '`') {
    return null;
  }

  if (quote === '`') {
    const endIndex = findTemplateLiteralEnd(input, index);

    if (endIndex === -1) {
      return null;
    }

    const value = input.slice(index + 1, endIndex);

    if (value.includes('${')) {
      return null;
    }

    return {
      value: unescapeStringValue(value),
      nextIndex: endIndex + 1,
    };
  }

  let value = '';
  let nextIndex = index + 1;

  while (nextIndex < input.length) {
    const char = input[nextIndex];

    if (char === quote) {
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

    value += unescapeSequence(escape);
    nextIndex += 2;
  }

  return null;
}

function findTemplateLiteralEnd(input: string, index: number) {
  let nextIndex = index + 1;

  while (nextIndex < input.length) {
    const char = input[nextIndex];

    if (char === '\\') {
      nextIndex += 2;
      continue;
    }

    if (char === '`') {
      return nextIndex;
    }

    nextIndex += 1;
  }

  return -1;
}

function unescapeStringValue(value: string) {
  let result = '';

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];

    if (char !== '\\') {
      result += char;
      continue;
    }

    const escape = value[index + 1];

    if (!escape) {
      return result;
    }

    result += unescapeSequence(escape);
    index += 1;
  }

  return result;
}

function unescapeSequence(escape: string) {
  switch (escape) {
    case 'n':
      return '\n';
    case 'r':
      return '\r';
    case 't':
      return '\t';
    default:
      return escape;
  }
}

function skipWhitespace(input: string, index: number) {
  while (index < input.length && /\s/.test(input[index])) {
    index += 1;
  }

  return index;
}

function escapeSingleQuotedJsString(value: string) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t');
}

function escapeDoubleQuotedAttribute(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, ' ');
}
