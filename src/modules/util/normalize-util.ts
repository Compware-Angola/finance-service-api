export function normalizeParam<T>(value: T) {
  if (
    value === undefined ||
    value === null ||
    value === "" ||
    value === "undefined" ||
    value === "null"
  ) {
    return undefined;
  }

  return value;
}
