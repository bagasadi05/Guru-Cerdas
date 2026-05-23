export const calculateRadarPoints = (values: number[], max: number, centerX: number, centerY: number, radius: number): string => {
  const n = values.length;
  if (n === 0) return '';
  const angleStep = (2 * Math.PI) / n;
  const points = values.map((value, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const ratio = value / max;
    const x = centerX + radius * ratio * Math.cos(angle);
    const y = centerY + radius * ratio * Math.sin(angle);
    return `${x},${y}`;
  });
  return points.join(' ');
};

export const calculateAxisEndpoints = (n: number, centerX: number, centerY: number, radius: number) => {
  if (n === 0) return [];
  const angleStep = (2 * Math.PI) / n;
  return Array.from({ length: n }).map((_, i) => {
    const angle = i * angleStep - Math.PI / 2;
    return { x1: centerX, y1: centerY, x2: centerX + radius * Math.cos(angle), y2: centerY + radius * Math.sin(angle) };
  });
};

export const calculateLabelPositions = (labels: string[], centerX: number, centerY: number, radius: number) => {
  const n = labels.length;
  if (n === 0) return [];
  const angleStep = (2 * Math.PI) / n;
  return labels.map((label, i) => {
    const angle = i * angleStep - Math.PI / 2;
    return { x: centerX + (radius + 15) * Math.cos(angle), y: centerY + (radius + 15) * Math.sin(angle), label };
  });
};