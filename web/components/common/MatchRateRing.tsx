'use client';

import React from 'react';

interface MatchRateRingProps {
  rate: number; // 0 to 100 or 0.0 to 1.0 (auto-scaled)
  size?: 'sm' | 'md' | 'lg';
  strokeWidth?: number;
  showLabel?: boolean;
  className?: string;
}

const SIZES = {
  sm: { dimension: 36, defaultStroke: 3.5, textSize: 'text-[10px]' },
  md: { dimension: 52, defaultStroke: 4.5, textSize: 'text-xs' },
  lg: { dimension: 76, defaultStroke: 6, textSize: 'text-base font-semibold' },
};

export function MatchRateRing({
  rate,
  size = 'md',
  strokeWidth,
  showLabel = true,
  className = '',
}: MatchRateRingProps) {
  // If rate is given as a fraction 0 <= rate <= 1, scale to percentage
  const percentage = rate <= 1 && rate > 0 ? rate * 100 : rate;
  const clamped = Math.max(0, Math.min(100, Math.round(percentage)));

  const sizeConfig = SIZES[size];
  const dimension = sizeConfig.dimension;
  const stroke = strokeWidth ?? sizeConfig.defaultStroke;
  const radius = (dimension - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clamped / 100) * circumference;

  // Determine progress color based on financial match rate thresholds
  let ringColor = 'stroke-matched';
  if (clamped < 70) {
    ringColor = 'stroke-foreground-muted';
  } else if (clamped < 95) {
    ringColor = 'stroke-exception';
  }

  return (
    <div
      role="meter"
      aria-label="Reconciliation match rate"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: dimension, height: dimension }}
    >
      <svg
        width={dimension}
        height={dimension}
        viewBox={`0 0 ${dimension} ${dimension}`}
        className="rotate-[-90deg] overflow-visible"
        aria-hidden="true"
      >
        {/* Background track */}
        <circle
          cx={dimension / 2}
          cy={dimension / 2}
          r={radius}
          className="stroke-border"
          strokeWidth={stroke}
          fill="none"
        />
        {/* Animated progress ring */}
        <circle
          cx={dimension / 2}
          cy={dimension / 2}
          r={radius}
          className={`${ringColor} transition-[stroke-dashoffset] duration-500 ease-out`}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      {showLabel && (
        <span
          className={`absolute inset-0 flex items-center justify-center font-mono ${sizeConfig.textSize} text-foreground select-none`}
        >
          {clamped}%
        </span>
      )}
    </div>
  );
}
