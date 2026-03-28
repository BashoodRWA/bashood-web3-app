export function BashoodLogo({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Bashood logo"
    >
      <defs>
        <linearGradient id="bhl-silver" x1="90" y1="30" x2="10" y2="70" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#CFD8DC" />
          <stop offset="60%" stopColor="#90A4AE" />
          <stop offset="100%" stopColor="#607D8B" />
        </linearGradient>
        <linearGradient id="bhl-blue" x1="30" y1="87" x2="9" y2="61" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1565C0" />
          <stop offset="100%" stopColor="#64B5F6" />
        </linearGradient>
        <linearGradient id="bhl-green" x1="70" y1="20" x2="35" y2="83" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#CCFF00" />
          <stop offset="35%" stopColor="#43A047" />
          <stop offset="100%" stopColor="#1B5E20" />
        </linearGradient>
      </defs>

      {/*
        Ring: r=42, center=50,50
        Gap at top-right: from 300° (1 o'clock) to 345° (2:30 o'clock) — no line
        Segments drawn (all CW, sweep=1, large-arc=0 since each < 180°):
          1. Silver: 345° → 120°  (right side + bottom)
          2. Blue:   120° → 165°  (lower-left)
          3. Silver: 165° → 300°  (left side + top)

        Key points (r=42):
          300°: (71.0, 13.6)   345°: (90.6, 39.1)
          120°: (29.0, 86.4)   165°: ( 9.4, 60.9)
      */}

      {/* Silver arc: right side + bottom */}
      <path
        d="M 90.6,39.1 A 42,42 0 0 1 29,86.4"
        stroke="url(#bhl-silver)"
        strokeWidth="5.5"
        strokeLinecap="round"
      />
      {/* Blue accent arc: lower-left */}
      <path
        d="M 29,86.4 A 42,42 0 0 1 9.4,60.9"
        stroke="url(#bhl-blue)"
        strokeWidth="5.5"
        strokeLinecap="round"
      />
      {/* Silver arc: left side + top  */}
      <path
        d="M 9.4,60.9 A 42,42 0 0 1 71,13.6"
        stroke="url(#bhl-silver)"
        strokeWidth="5.5"
        strokeLinecap="round"
      />

      {/* Inner subtle ring lines for depth (r=37) */}
      <path
        d="M 85.7,40.4 A 37,37 0 0 1 31.5,82.1"
        stroke="rgba(255,255,255,0.10)"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <path
        d="M 14.3,59.6 A 37,37 0 0 1 68.5,17.9"
        stroke="rgba(255,255,255,0.10)"
        strokeWidth="1"
        strokeLinecap="round"
      />

      {/* Green feather body */}
      <path
        d="M 70,20 C 76,28 68,45 60,58 C 56,64 50,72 40,79 L 35,83 C 32,76 24,65 25,56 C 26,48 32,35 40,25 C 46,18 62,14 70,20 Z"
        fill="url(#bhl-green)"
      />

      {/* White central spine */}
      <path
        d="M 35,83 Q 52,51 70,20"
        stroke="rgba(255,255,255,0.88)"
        strokeWidth="1.9"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}
