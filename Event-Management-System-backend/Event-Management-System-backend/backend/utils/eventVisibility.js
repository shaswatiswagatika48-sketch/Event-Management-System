const hiddenEventTitlePatterns = [
  /^(?:event\s+)?tech\s+fest(?:\s+2026)?$/i,
  /^college\s+tech\s+fest$/i
];

export const isHiddenEventTitle = (title = "") =>
  hiddenEventTitlePatterns.some((pattern) => pattern.test(title.trim()));

export const visibleEventFilter = {
  $nor: hiddenEventTitlePatterns.map((pattern) => ({ title: pattern }))
};
