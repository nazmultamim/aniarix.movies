

export const WATCH_STATUSES = [
  { value: 'watching', label: 'Watching', color: '#22c55e' },
  { value: 'completed', label: 'Completed', color: '#3b82f6' },
  { value: 'on_hold', label: 'On-Hold', color: '#eab308' },
  { value: 'dropped', label: 'Dropped', color: '#ef4444' },
  { value: 'plan_to_watch', label: 'Plan to Watch', color: '#9ca3af' },
];

export const WATCH_STATUS_VALUES = WATCH_STATUSES.map((s) => s.value);