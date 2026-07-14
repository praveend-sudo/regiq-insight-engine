import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export function ConfidenceRing({ value, size = 96 }: { value: number; size?: number }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setV(value), 60);
    return () => clearTimeout(t);
  }, [value]);

  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (v / 100) * c;

  const color =
    value >= 85
      ? "var(--success)"
      : value >= 70
        ? "var(--warning)"
        : "var(--risk)";

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="var(--muted)"
          strokeWidth={stroke}
          fill="none"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          initial={{ strokeDasharray: c, strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold" style={{ color }}>
          {value}%
        </span>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Confidence
        </span>
      </div>
    </div>
  );
}
