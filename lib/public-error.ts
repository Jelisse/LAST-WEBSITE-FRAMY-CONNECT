export function publicError(
  error: unknown,
  fallback = 'Não foi possível guardar. Actualize e tente novamente.',
) {
  const message = error instanceof Error ? error.message : '';
  if (
    !message ||
    /D1|SQLITE|database|constraint|syntax|binding|fetch|undefined|null|JSON|Unexpected|Cannot|stack/i.test(
      message,
    )
  ) {
    console.error(
      'Request failed',
      error instanceof Error ? error.name : 'UnknownError',
    );
    return fallback;
  }
  return message;
}
