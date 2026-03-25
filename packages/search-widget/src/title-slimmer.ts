const DASH_DELIMITER = " - ";
const SLASH_DELIMITER = " / ";
const DEFAULT_MAX_TITLE_LENGTH = 47;

interface SlimTitleOptions {
  maxLength?: number;
}

export function slimDisplayTitle(title: string, options: SlimTitleOptions = {}): string {
  const normalizedTitle = normalizeTitle(title);
  if (!normalizedTitle) {
    return "";
  }

  const maxLength = resolveMaxLength(options.maxLength);
  const splitTitle = splitByKnownDelimiters(normalizedTitle);
  const questionTrimmedTitle = trimByQuestionMark(splitTitle);

  return truncateTitle(questionTrimmedTitle, maxLength);
}

function normalizeTitle(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function resolveMaxLength(maxLength: number | undefined): number {
  if (!Number.isFinite(maxLength) || typeof maxLength !== "number") {
    return DEFAULT_MAX_TITLE_LENGTH;
  }
  return maxLength > 0 ? Math.floor(maxLength) : DEFAULT_MAX_TITLE_LENGTH;
}

function splitByKnownDelimiters(value: string): string {
  const slashTrimmed = splitByDelimiter(value, SLASH_DELIMITER);
  return splitByDelimiter(slashTrimmed, DASH_DELIMITER);
}

function splitByDelimiter(value: string, delimiter: string): string {
  const delimiterIndex = value.indexOf(delimiter);
  if (delimiterIndex <= 0) {
    return value;
  }
  return value.slice(0, delimiterIndex).trim();
}

function trimByQuestionMark(value: string): string {
  const questionMarkIndex = value.indexOf("?");
  if (questionMarkIndex < 0) {
    return value.trim();
  }
  return value.slice(0, questionMarkIndex + 1).trim();
}

function truncateTitle(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength).trimEnd()}...`;
}
