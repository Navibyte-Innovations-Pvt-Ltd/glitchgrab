"use client";

const primary = "var(--color-primary)";
const muted = "var(--color-muted-foreground)";

export function HandwrittenNoteAnim() {
  return (
    <svg viewBox="0 0 80 80" fill="none" className="h-16 w-16 sm:h-20 sm:w-20">
      {/* Paper */}
      <rect x="12" y="8" width="48" height="60" rx="4" stroke={muted} strokeWidth="1.5" opacity="0.3" />
      {/* Lines on paper */}
      <line x1="20" y1="22" x2="52" y2="22" stroke={muted} strokeWidth="1" opacity="0.2" />
      <line x1="20" y1="32" x2="52" y2="32" stroke={muted} strokeWidth="1" opacity="0.2" />
      <line x1="20" y1="42" x2="52" y2="42" stroke={muted} strokeWidth="1" opacity="0.2" />
      <line x1="20" y1="52" x2="40" y2="52" stroke={muted} strokeWidth="1" opacity="0.2" />
      {/* Handwriting scribble that draws itself */}
      <path
        d="M20 22 Q26 18 32 23 Q38 28 44 21 Q48 18 52 22"
        stroke={primary}
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
        strokeDasharray="50"
        strokeDashoffset="50"
      >
        <animate attributeName="stroke-dashoffset" from="50" to="0" dur="1.5s" begin="0s" fill="freeze" repeatCount="indefinite" />
      </path>
      <path
        d="M20 32 Q28 28 36 33 Q44 38 52 31"
        stroke={primary}
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
        strokeDasharray="45"
        strokeDashoffset="45"
      >
        <animate attributeName="stroke-dashoffset" from="45" to="0" dur="1.5s" begin="0.4s" fill="freeze" repeatCount="indefinite" />
      </path>
      <path
        d="M20 42 Q30 38 40 43"
        stroke={primary}
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
        strokeDasharray="25"
        strokeDashoffset="25"
      >
        <animate attributeName="stroke-dashoffset" from="25" to="0" dur="1.5s" begin="0.8s" fill="freeze" repeatCount="indefinite" />
      </path>
      {/* Pen */}
      <g>
        <animateTransform attributeName="transform" type="translate" values="0,0; 20,0; 20,10; 0,10; 0,20; 10,20" dur="4s" repeatCount="indefinite" />
        <line x1="18" y1="20" x2="14" y2="16" stroke={primary} strokeWidth="2" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export function AutoCaptureAnim() {
  return (
    <svg viewBox="0 0 80 80" fill="none" className="h-16 w-16 sm:h-20 sm:w-20">
      {/* Terminal window */}
      <rect x="8" y="12" width="56" height="48" rx="4" stroke={muted} strokeWidth="1.5" opacity="0.3" />
      {/* Title bar dots */}
      <circle cx="16" cy="20" r="2" fill="#ef4444" opacity="0.6" />
      <circle cx="23" cy="20" r="2" fill="#eab308" opacity="0.6" />
      <circle cx="30" cy="20" r="2" fill="#22c55e" opacity="0.6" />
      {/* Divider */}
      <line x1="8" y1="26" x2="64" y2="26" stroke={muted} strokeWidth="1" opacity="0.2" />
      {/* Error text lines */}
      <rect x="14" y="31" width="24" height="3" rx="1" fill="#ef4444" opacity="0.5">
        <animate attributeName="opacity" values="0;0.5" dur="0.3s" begin="0.2s" fill="freeze" />
      </rect>
      <rect x="14" y="38" width="36" height="3" rx="1" fill={muted} opacity="0.2">
        <animate attributeName="opacity" values="0;0.2" dur="0.3s" begin="0.5s" fill="freeze" />
      </rect>
      <rect x="14" y="45" width="30" height="3" rx="1" fill={muted} opacity="0.2">
        <animate attributeName="opacity" values="0;0.2" dur="0.3s" begin="0.8s" fill="freeze" />
      </rect>
      {/* Capture pulse ring */}
      <circle cx="56" cy="52" r="4" fill={primary} opacity="0.8">
        <animate attributeName="r" values="4;4;4" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx="56" cy="52" r="4" fill="none" stroke={primary} strokeWidth="1.5">
        <animate attributeName="r" values="4;12" dur="1.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.6;0" dur="1.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="56" cy="52" r="4" fill="none" stroke={primary} strokeWidth="1">
        <animate attributeName="r" values="4;16" dur="1.5s" begin="0.4s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.4;0" dur="1.5s" begin="0.4s" repeatCount="indefinite" />
      </circle>
      {/* Arrow going out */}
      <path
        d="M56 44 L56 36 L60 40"
        stroke={primary}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0"
      >
        <animate attributeName="opacity" values="0;0.8;0" dur="2s" begin="1s" repeatCount="indefinite" />
      </path>
    </svg>
  );
}

export function ReportButtonAnim() {
  return (
    <svg viewBox="0 0 80 80" fill="none" className="h-16 w-16 sm:h-20 sm:w-20">
      {/* Browser window */}
      <rect x="8" y="8" width="56" height="44" rx="4" stroke={muted} strokeWidth="1.5" opacity="0.3" />
      <line x1="8" y1="18" x2="64" y2="18" stroke={muted} strokeWidth="1" opacity="0.2" />
      {/* URL bar */}
      <rect x="14" y="12" width="28" height="3" rx="1.5" fill={muted} opacity="0.15" />
      {/* Page content placeholder */}
      <rect x="14" y="24" width="44" height="3" rx="1" fill={muted} opacity="0.1" />
      <rect x="14" y="31" width="32" height="3" rx="1" fill={muted} opacity="0.1" />
      {/* Report button */}
      <rect x="18" y="39" width="36" height="10" rx="5" fill={primary} opacity="0.15">
        <animate attributeName="opacity" values="0.15;0.3;0.15" dur="2s" repeatCount="indefinite" />
      </rect>
      <text x="36" y="46.5" textAnchor="middle" fill={primary} fontSize="5" fontWeight="600" fontFamily="system-ui">
        Report Bug
      </text>
      {/* Click ripple */}
      <circle cx="36" cy="44" r="0" fill={primary} opacity="0">
        <animate attributeName="r" values="0;18" dur="1.2s" begin="0s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.3;0" dur="1.2s" begin="0s" repeatCount="indefinite" />
      </circle>
      {/* Flying issue card going to GitHub */}
      <g opacity="0">
        <animate attributeName="opacity" values="0;1;1;0" dur="2.5s" begin="0.6s" repeatCount="indefinite" />
        <rect x="48" y="56" width="24" height="16" rx="3" fill="none" stroke={primary} strokeWidth="1.2">
          <animate attributeName="y" values="56;60" dur="2.5s" begin="0.6s" repeatCount="indefinite" />
        </rect>
        {/* GitHub icon simplified */}
        <circle cx="60" cy="64" r="4" fill="none" stroke={primary} strokeWidth="1">
          <animate attributeName="cy" values="64;68" dur="2.5s" begin="0.6s" repeatCount="indefinite" />
        </circle>
      </g>
    </svg>
  );
}

export function ScreenshotUploadAnim() {
  return (
    <svg viewBox="0 0 80 80" fill="none" className="h-16 w-16 sm:h-20 sm:w-20">
      {/* Image frame */}
      <rect x="10" y="14" width="40" height="32" rx="4" stroke={muted} strokeWidth="1.5" opacity="0.3" />
      {/* Mountain landscape in screenshot */}
      <path d="M10 40 L22 28 L32 36 L38 30 L50 40 Z" fill={muted} opacity="0.1" />
      <circle cx="20" cy="24" r="3" fill={muted} opacity="0.15" />
      {/* Upload arrow */}
      <path
        d="M56 46 L56 28"
        stroke={primary}
        strokeWidth="2"
        strokeLinecap="round"
      >
        <animate attributeName="d" values="M56 46 L56 28;M56 42 L56 24;M56 46 L56 28" dur="2s" repeatCount="indefinite" />
      </path>
      <path
        d="M50 34 L56 28 L62 34"
        stroke={primary}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        <animate attributeName="d" values="M50 34 L56 28 L62 34;M50 30 L56 24 L62 30;M50 34 L56 28 L62 34" dur="2s" repeatCount="indefinite" />
      </path>
      {/* AI processing sparkles */}
      <g opacity="0">
        <animate attributeName="opacity" values="0;1;0" dur="1.5s" begin="1s" repeatCount="indefinite" />
        <circle cx="24" cy="58" r="1.5" fill={primary} />
        <circle cx="36" cy="54" r="1" fill={primary} />
        <circle cx="30" cy="62" r="1.2" fill={primary} />
      </g>
      {/* Output issue card */}
      <rect x="16" y="52" width="36" height="20" rx="3" fill="none" stroke={primary} strokeWidth="1.2" opacity="0">
        <animate attributeName="opacity" values="0;0;0.6;0.6;0" dur="3s" begin="0.5s" repeatCount="indefinite" />
      </rect>
      <rect x="22" y="57" width="20" height="2" rx="1" fill={primary} opacity="0">
        <animate attributeName="opacity" values="0;0;0.4;0.4;0" dur="3s" begin="0.7s" repeatCount="indefinite" />
      </rect>
      <rect x="22" y="62" width="14" height="2" rx="1" fill={primary} opacity="0">
        <animate attributeName="opacity" values="0;0;0.3;0.3;0" dur="3s" begin="0.9s" repeatCount="indefinite" />
      </rect>
      <rect x="22" y="67" width="8" height="2" rx="1" fill={primary} opacity="0">
        <animate attributeName="opacity" values="0;0;0.2;0.2;0" dur="3s" begin="1.1s" repeatCount="indefinite" />
      </rect>
    </svg>
  );
}
