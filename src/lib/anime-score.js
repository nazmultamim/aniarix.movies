export function normalizeAnimeScore(score) {
  if (score == null || score === '') return null;

  const numericScore = Number(score);
  if (!Number.isFinite(numericScore)) return null;

  const normalizedScore = numericScore > 10 ? numericScore / 10 : numericScore;
  return Math.round(normalizedScore * 10) / 10;
}

export function formatAnimeScore(score) {
  const normalizedScore = normalizeAnimeScore(score);
  if (normalizedScore == null) return null;

  return Number.isInteger(normalizedScore)
    ? String(normalizedScore)
    : normalizedScore.toFixed(1).replace(/\.0$/, '');
}
