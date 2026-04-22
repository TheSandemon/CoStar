'use client';

interface ScoreRingProps {
  score: number;
  size?: number;
}

export function ScoreRing({ score, size = 28 }: ScoreRingProps) {
  const r = 36;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference * (1 - score / 100);
  const color = score >= 75 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444';
  const containerSize = size * 4;

  return (
    <div className="relative flex items-center justify-center" style={{ width: containerSize, height: containerSize }}>
      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={r} fill="none" stroke="rgb(51 65 85)" strokeWidth="5" />
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
      </svg>
      <div className="text-center">
        <span style={{ fontSize: size }} className="font-bold text-white leading-none">{score}</span>
        <span className="block text-xs text-slate-400">/ 100</span>
      </div>
    </div>
  );
}
