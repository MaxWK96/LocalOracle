interface LogoProps {
  className?: string;
  iconSize?: number;
}

export function Logo({ className = "", iconSize = 32 }: LogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Pin with oracle eye */}
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="loPinGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
        {/* Pin body */}
        <path
          d="M16 2C11.03 2 7 6.03 7 11c0 5.25 9 19 9 19s9-13.75 9-19c0-4.97-4.03-9-9-9z"
          fill="url(#loPinGradient)"
        />
        {/* Eye whites */}
        <circle cx="16" cy="11" r="4.5" fill="white" />
        {/* Pupil */}
        <circle cx="16" cy="11" r="2.2" fill="#1e40af" />
        {/* Iris highlight */}
        <circle cx="14.8" cy="9.8" r="0.8" fill="white" opacity="0.7" />
      </svg>

      {/* Wordmark */}
      <span
        className="text-lg font-bold tracking-tight"
        style={{
          background: "linear-gradient(to right, #60a5fa, #a78bfa)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}
      >
        LocalOracle
      </span>
    </div>
  );
}
