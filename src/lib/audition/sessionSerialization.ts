export function stripUndefinedFields<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .map((item) => stripUndefinedFields(item))
      .filter((item) => item !== undefined) as T;
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, stripUndefinedFields(item)]),
    ) as T;
  }

  return value;
}
