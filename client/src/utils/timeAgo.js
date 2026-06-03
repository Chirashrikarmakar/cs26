export function formatDaysAgo(date) {
  if (!date) return '';
  const ms = Date.now() - new Date(date).getTime();
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  if (days <= 0) return 'today';
  if (days === 1) return '1d unanswered';
  if (days < 7) return `${days}d unanswered`;
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return '1w unanswered';
  return `${weeks}w unanswered`;
}
