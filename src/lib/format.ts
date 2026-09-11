export function shortHash(value: string, length = 10) {
  return value.length > length * 2 ? `${value.slice(0, length)}…${value.slice(-length)}` : value;
}

export function shortText(value: string, length = 140) {
  return value.length > length ? `${value.slice(0, length - 1).trimEnd()}…` : value;
}

export function formatDate(value: string) {
  if (!value) return "Not published";
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : date.toLocaleString("en", { dateStyle: "medium", timeStyle: "short" });
}

