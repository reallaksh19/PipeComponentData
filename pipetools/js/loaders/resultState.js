export function makeIssue(code, message, context = {}) {
  return { code, message, context };
}

export function issueLabel(issue) {
  if (!issue) return 'No issue';
  return `${issue.code}: ${issue.message}`;
}

export function loadedRows(rows, metadata = {}) {
  return { rows, metadata, issues: [] };
}

export function emptyRows(issue, metadata = {}) {
  return { rows: [], metadata, issues: [issue] };
}
