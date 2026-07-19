import React, { useMemo } from 'react';
import { calculateRadarPoints, calculateAxisEndpoints, calculateLabelPositions } from '../utils/radarChartUtils';

export interface RadarDataset {
  values: number[];
  label?: string;
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
  pointStrokeColor?: string;
}

interface RadarChartProps {
  labels: string[];
  datasets: RadarDataset[];
  maxScore?: number;
  chartSize?: number;
  ariaLabel?: string;
  titleText?: string;
  truncateLabels?: boolean;
}

export const RadarChart: React.FC<RadarChartProps> = ({
  labels,
  datasets,
  maxScore = 100,
  chartSize = 260,
  ariaLabel,
  titleText,
  truncateLabels = false,
}) => {
  const centerX = chartSize / 2;
  const centerY = chartSize / 2;
  const radius = chartSize / 2 - 40;
  const gridLevels = [20, 40, 60, 80, 100];

  const axisEndpoints = useMemo(
    () => calculateAxisEndpoints(labels.length, centerX, centerY, radius),
    [labels.length, centerX, centerY, radius]
  );

  const labelPositions = useMemo(
    () => calculateLabelPositions(labels, centerX, centerY, radius),
    [labels, centerX, centerY, radius]
  );

  return (
    <svg
      width={chartSize}
      height={chartSize}
      className="overflow-visible"
      role="img"
      aria-label={ariaLabel}
    >
      {titleText && <title>{titleText}</title>}

      {/* Radar Grid Levels (20, 40, 60, 80, 100) */}
      {gridLevels.map((level) => (
        <polygon
          key={level}
          points={calculateRadarPoints(
            labels.map(() => level),
            maxScore,
            centerX,
            centerY,
            radius
          )}
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          className="text-slate-200 dark:text-slate-700"
        />
      ))}

      {/* Axis lines */}
      {axisEndpoints.map((axis, i) => (
        <line
          key={i}
          x1={axis.x1}
          y1={axis.y1}
          x2={axis.x2}
          y2={axis.y2}
          stroke="currentColor"
          strokeWidth="1"
          className="text-slate-200 dark:text-slate-700"
        />
      ))}

      {/* Polygons */}
      {datasets.map((dataset, dIdx) => (
        <polygon
          key={`polygon-${dIdx}`}
          points={calculateRadarPoints(dataset.values, maxScore, centerX, centerY, radius)}
          fill={dataset.fillColor || 'rgba(99, 102, 241, 0.3)'}
          stroke={dataset.strokeColor || 'rgb(99, 102, 241)'}
          strokeWidth={dataset.strokeWidth ?? 2}
          strokeDasharray={dataset.strokeDasharray}
        />
      ))}

      {/* Data point circles */}
      {datasets.map((dataset, dIdx) =>
        dataset.values.map((val, i) => {
          const angle = i * ((2 * Math.PI) / labels.length) - Math.PI / 2;
          const ratio = val / maxScore;
          return (
            <circle
              key={`circle-${dIdx}-${i}`}
              cx={centerX + radius * ratio * Math.cos(angle)}
              cy={centerY + radius * ratio * Math.sin(angle)}
              r="4"
              fill="white"
              stroke={dataset.pointStrokeColor || dataset.strokeColor || 'rgb(99, 102, 241)'}
              strokeWidth="2"
            />
          );
        })
      )}

      {/* Labels */}
      {labelPositions.map((pos, i) => {
        const truncatedLabel =
          truncateLabels && pos.label.length > 10
            ? pos.label.substring(0, 10) + '...'
            : pos.label;
        return (
          <g key={i} className="cursor-pointer group">
            <text
              x={pos.x}
              y={pos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-xxs font-bold fill-slate-600 dark:fill-slate-400 hover:fill-indigo-650 dark:hover:fill-indigo-400 transition-colors"
            >
              {truncatedLabel}
            </text>
            <title>
              {pos.label}
              {datasets.map(
                (ds, idx) => `\n${ds.label || `Dataset ${idx + 1}`}: ${ds.values[i] ?? 0}`
              ).join('')}
            </title>
          </g>
        );
      })}
    </svg>
  );
};
