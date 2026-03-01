interface ValidationIssue {
  path: (string | number)[];
  message: string;
}

const MESSAGE_MAP: Record<string, string> = {
  "Too small: expected string to have >=1 characters": "обязательное поле",
  "Required": "обязательное поле",
  "Invalid url": "невалидный URL",
  "Invalid email": "невалидный email",
};

function humanizePath(path: (string | number)[]): string {
  // contentBlocks.0.data.title → title
  // Ищем последний значимый сегмент после "data"
  const dataIdx = path.lastIndexOf("data");
  if (dataIdx !== -1 && dataIdx < path.length - 1) {
    return path.slice(dataIdx + 1).join(".");
  }
  // fallback: последний строковый сегмент
  const last = [...path].reverse().find((s) => typeof s === "string");
  return last ? String(last) : path.join(".");
}

function humanizeMessage(message: string): string {
  return MESSAGE_MAP[message] ?? message;
}

/**
 * Извлекает человекочитаемое описание ошибки из oRPC/Zod ошибки.
 * Если есть issues (валидация) — возвращает список незаполненных полей.
 * Иначе — возвращает error.message.
 */
export function formatApiError(error: any): string {
  const issues: ValidationIssue[] | undefined = error?.data?.issues;

  if (!issues?.length) {
    return error?.message ?? "Неизвестная ошибка";
  }

  const lines = issues.map((issue) => {
    const field = humanizePath(issue.path);
    const msg = humanizeMessage(issue.message);
    return `${field} — ${msg}`;
  });

  return lines.join("\n");
}
