const SYMBOLS = [
  { ch: "$", left: "6%", top: "10%", size: 42, dur: 38, delay: -2, rot: -8 },
  { ch: "€", left: "88%", top: "14%", size: 34, dur: 44, delay: -9, rot: 6 },
  { ch: "₹", left: "14%", top: "74%", size: 50, dur: 41, delay: -14, rot: 10 },
  { ch: "£", left: "80%", top: "70%", size: 30, dur: 35, delay: -4, rot: -12 },
  { ch: "¥", left: "48%", top: "6%", size: 28, dur: 47, delay: -18, rot: 4 },
  { ch: "₩", left: "32%", top: "42%", size: 24, dur: 43, delay: -7, rot: -6 },
  { ch: "₽", left: "62%", top: "34%", size: 32, dur: 39, delay: -11, rot: 8 },
  { ch: "฿", left: "94%", top: "50%", size: 26, dur: 46, delay: -3, rot: -4 },
  { ch: "₺", left: "3%", top: "46%", size: 22, dur: 36, delay: -16, rot: 12 },
  { ch: "₪", left: "56%", top: "88%", size: 28, dur: 44, delay: -6, rot: -10 },
  { ch: "₫", left: "24%", top: "20%", size: 20, dur: 33, delay: -12, rot: 5 },
  { ch: "₴", left: "70%", top: "4%", size: 24, dur: 41, delay: -20, rot: -7 },
  { ch: "$", left: "40%", top: "62%", size: 22, dur: 37, delay: -24, rot: 9 },
  { ch: "€", left: "10%", top: "30%", size: 18, dur: 45, delay: -8, rot: -5 },
  { ch: "₹", left: "60%", top: "58%", size: 20, dur: 40, delay: -15, rot: -9 },
  { ch: "£", left: "44%", top: "88%", size: 26, dur: 34, delay: -21, rot: 7 },
  { ch: "¥", left: "20%", top: "92%", size: 18, dur: 48, delay: -5, rot: -11 },
  { ch: "₩", left: "86%", top: "84%", size: 24, dur: 38, delay: -13, rot: 6 },
  { ch: "₽", left: "76%", top: "24%", size: 20, dur: 42, delay: -19, rot: -8 },
  { ch: "฿", left: "36%", top: "16%", size: 16, dur: 36, delay: -10, rot: 10 },
  { ch: "₺", left: "50%", top: "48%", size: 18, dur: 44, delay: -25, rot: -6 },
  { ch: "₪", left: "8%", top: "62%", size: 20, dur: 39, delay: -17, rot: 8 },
  { ch: "₫", left: "96%", top: "8%", size: 22, dur: 46, delay: -1, rot: -4 },
  { ch: "₴", left: "66%", top: "94%", size: 20, dur: 35, delay: -23, rot: 11 },
];

// Fixed (not random) positions — this renders on the server too, so
// Math.random() here would mismatch on hydration.
export default function AuthBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="auth-satin-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgb(var(--color-satin-1))" />
            <stop offset="50%" stopColor="rgb(var(--color-satin-2))" />
            <stop offset="100%" stopColor="rgb(var(--color-satin-1))" />
          </linearGradient>
          <filter id="auth-satin-noise" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.008 0.014" numOctaves="2" seed="7" result="noise">
              <animate
                attributeName="baseFrequency"
                dur="100s"
                values="0.008 0.014;0.011 0.018;0.007 0.012;0.008 0.014"
                repeatCount="indefinite"
              />
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="45" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
        {/* Painted larger than the viewport so the noise displacement never uncovers a bare edge. */}
        <rect x="-15%" y="-15%" width="130%" height="130%" fill="url(#auth-satin-grad)" filter="url(#auth-satin-noise)" />
      </svg>

      <div className="auth-shine auth-shine-1 absolute inset-0" />
      <div className="auth-shine auth-shine-2 absolute inset-0" />

      {SYMBOLS.map((s, i) => (
        <span
          key={i}
          className="auth-symbol absolute select-none text-text-faint"
          style={{
            left: s.left,
            top: s.top,
            fontSize: s.size,
            animationDuration: `${s.dur}s`,
            animationDelay: `${s.delay}s`,
            ["--rot" as string]: `${s.rot}deg`,
          }}
        >
          {s.ch}
        </span>
      ))}
    </div>
  );
}
