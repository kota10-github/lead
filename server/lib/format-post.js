function formatKpiPost(kpiData) {
  const lines = [
    '📊 なまいきくんエバー KPI速報',
    '━━━━━━━━━━━━━━',
  ];

  for (const kpi of kpiData.kpis) {
    if (kpi.total > 0) {
      const remaining = Math.max(0, kpi.total - kpi.done);
      lines.push(`${kpi.label}: ${kpi.done} / ${kpi.total}（残${remaining}）`);
    } else {
      lines.push(`${kpi.label}: ${kpi.done}`);
    }
  }

  lines.push('━━━━━━━━━━━━━━');
  lines.push(`${kpiData.timestamp} 更新`);

  const text = lines.join('\n');

  // Threads投稿は500文字制限
  if (text.length > 500) {
    return text.substring(0, 497) + '...';
  }
  return text;
}

module.exports = { formatKpiPost };
