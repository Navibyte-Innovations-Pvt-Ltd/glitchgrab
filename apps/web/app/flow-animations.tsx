"use client";

const primary = "var(--color-primary)";
const muted = "var(--color-muted-foreground)";

export function DashboardChatAnim() {
  return (
    <svg viewBox="0 0 80 80" fill="none" className="h-16 w-16 sm:h-20 sm:w-20">
      {/* Chat window */}
      <rect x="8" y="8" width="56" height="56" rx="6" stroke={muted} strokeWidth="1.5" opacity="0.3" />
      {/* User message bubble */}
      <rect x="24" y="16" width="34" height="10" rx="5" fill={muted} opacity="0.15">
        <animate attributeName="opacity" values="0;0.15" dur="0.4s" begin="0s" fill="freeze" />
      </rect>
      <rect x="28" y="19.5" width="20" height="3" rx="1" fill={muted} opacity="0.25">
        <animate attributeName="opacity" values="0;0.25" dur="0.4s" begin="0.1s" fill="freeze" />
      </rect>
      {/* AI response bubble */}
      <rect x="14" y="30" width="38" height="18" rx="5" fill={primary} opacity="0">
        <animate attributeName="opacity" values="0;0.12" dur="0.4s" begin="0.6s" fill="freeze" />
      </rect>
      {/* AI typing dots then content */}
      <g opacity="0">
        <animate attributeName="opacity" values="0;1;1;0" dur="1.2s" begin="0.7s" fill="freeze" />
        <circle cx="22" cy="39" r="1.5" fill={primary}>
          <animate attributeName="opacity" values="0.3;1;0.3" dur="0.6s" repeatCount="3" begin="0.7s" />
        </circle>
        <circle cx="28" cy="39" r="1.5" fill={primary}>
          <animate attributeName="opacity" values="0.3;1;0.3" dur="0.6s" repeatCount="3" begin="0.8s" />
        </circle>
        <circle cx="34" cy="39" r="1.5" fill={primary}>
          <animate attributeName="opacity" values="0.3;1;0.3" dur="0.6s" repeatCount="3" begin="0.9s" />
        </circle>
      </g>
      {/* AI generated issue lines */}
      <rect x="18" y="34" width="24" height="2.5" rx="1" fill={primary} opacity="0">
        <animate attributeName="opacity" values="0;0.5" dur="0.3s" begin="2s" fill="freeze" />
      </rect>
      <rect x="18" y="39" width="30" height="2.5" rx="1" fill={primary} opacity="0">
        <animate attributeName="opacity" values="0;0.3" dur="0.3s" begin="2.2s" fill="freeze" />
      </rect>
      <rect x="18" y="44" width="18" height="2.5" rx="1" fill={primary} opacity="0">
        <animate attributeName="opacity" values="0;0.3" dur="0.3s" begin="2.4s" fill="freeze" />
      </rect>
      {/* GitHub icon flying out */}
      <g opacity="0">
        <animate attributeName="opacity" values="0;1;1;0" dur="1.5s" begin="2.8s" fill="freeze" />
        <circle cx="58" cy="58" r="6" fill="none" stroke={primary} strokeWidth="1.2">
          <animate attributeName="r" values="6;8" dur="1.5s" begin="2.8s" fill="freeze" />
        </circle>
        <path d="M56 57 L58 55 L60 57" stroke={primary} strokeWidth="1" strokeLinecap="round" fill="none" />
        <line x1="58" y1="55" x2="58" y2="61" stroke={primary} strokeWidth="1" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export function AutoCaptureAnim() {
  return (
    <svg viewBox="0 0 80 80" fill="none" className="h-16 w-16 sm:h-20 sm:w-20">
      {/* Terminal window */}
      <rect x="8" y="10" width="56" height="52" rx="4" stroke={muted} strokeWidth="1.5" opacity="0.3" />
      {/* Title bar dots */}
      <circle cx="16" cy="18" r="2" fill="#ef4444" opacity="0.6" />
      <circle cx="23" cy="18" r="2" fill="#eab308" opacity="0.6" />
      <circle cx="30" cy="18" r="2" fill="#22c55e" opacity="0.6" />
      <line x1="8" y1="24" x2="64" y2="24" stroke={muted} strokeWidth="1" opacity="0.2" />
      {/* Code lines */}
      <rect x="14" y="28" width="28" height="2.5" rx="1" fill={muted} opacity="0.15" />
      <rect x="14" y="34" width="38" height="2.5" rx="1" fill={muted} opacity="0.15" />
      {/* Error flash */}
      <rect x="14" y="40" width="20" height="2.5" rx="1" fill="#ef4444" opacity="0">
        <animate attributeName="opacity" values="0;0.7;0.7" dur="0.5s" begin="0.5s" fill="freeze" />
      </rect>
      <rect x="14" y="46" width="34" height="2.5" rx="1" fill="#ef4444" opacity="0">
        <animate attributeName="opacity" values="0;0.4;0.4" dur="0.5s" begin="0.7s" fill="freeze" />
      </rect>
      {/* Capture radar pulse */}
      <circle cx="54" cy="52" r="3" fill={primary} opacity="0">
        <animate attributeName="opacity" values="0;0.9;0.9" dur="0.3s" begin="1.2s" fill="freeze" />
      </circle>
      <circle cx="54" cy="52" r="3" fill="none" stroke={primary} strokeWidth="1.5" opacity="0">
        <animate attributeName="opacity" values="0;0.6;0" dur="1.2s" begin="1.4s" repeatCount="indefinite" />
        <animate attributeName="r" values="3;14" dur="1.2s" begin="1.4s" repeatCount="indefinite" />
      </circle>
      <circle cx="54" cy="52" r="3" fill="none" stroke={primary} strokeWidth="1" opacity="0">
        <animate attributeName="opacity" values="0;0.3;0" dur="1.2s" begin="1.8s" repeatCount="indefinite" />
        <animate attributeName="r" values="3;18" dur="1.2s" begin="1.8s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

export function ReportButtonAnim() {
  return (
    <svg viewBox="0 0 80 80" fill="none" className="h-16 w-16 sm:h-20 sm:w-20">
      {/* App window */}
      <rect x="8" y="8" width="56" height="56" rx="4" stroke={muted} strokeWidth="1.5" opacity="0.3" />
      <line x1="8" y1="18" x2="64" y2="18" stroke={muted} strokeWidth="1" opacity="0.2" />
      {/* Page content */}
      <rect x="14" y="24" width="44" height="3" rx="1" fill={muted} opacity="0.1" />
      <rect x="14" y="31" width="32" height="3" rx="1" fill={muted} opacity="0.1" />
      <rect x="14" y="38" width="38" height="3" rx="1" fill={muted} opacity="0.1" />
      {/* Report button (floating) */}
      <rect x="38" y="48" width="22" height="10" rx="5" fill={primary} opacity="0.2">
        <animate attributeName="opacity" values="0.2;0.35;0.2" dur="2s" repeatCount="indefinite" />
      </rect>
      <text x="49" y="55" textAnchor="middle" fill={primary} fontSize="4.5" fontWeight="600" fontFamily="system-ui">
        Report
      </text>
      {/* Click effect */}
      <circle cx="49" cy="53" r="0" fill={primary} opacity="0">
        <animate attributeName="r" values="0;16" dur="1s" begin="0.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.3;0" dur="1s" begin="0.5s" repeatCount="indefinite" />
      </circle>
      {/* Screenshot flash */}
      <rect x="8" y="8" width="56" height="56" rx="4" fill="white" opacity="0">
        <animate attributeName="opacity" values="0;0.15;0" dur="0.3s" begin="1s" repeatCount="indefinite" />
      </rect>
      {/* Issue card slides up */}
      <g opacity="0">
        <animate attributeName="opacity" values="0;0;1;1;0" dur="3s" begin="1.2s" repeatCount="indefinite" />
        <rect x="4" y="66" width="30" height="14" rx="3" fill="none" stroke={primary} strokeWidth="1.2">
          <animate attributeName="y" values="72;66" dur="0.5s" begin="1.6s" repeatCount="indefinite" />
        </rect>
        <rect x="9" y="70" width="16" height="2" rx="1" fill={primary} opacity="0.5">
          <animate attributeName="y" values="76;70" dur="0.5s" begin="1.6s" repeatCount="indefinite" />
        </rect>
        <rect x="9" y="74" width="10" height="2" rx="1" fill={primary} opacity="0.3">
          <animate attributeName="y" values="80;74" dur="0.5s" begin="1.6s" repeatCount="indefinite" />
        </rect>
      </g>
    </svg>
  );
}

export function DedupAnim() {
  return (
    <svg viewBox="0 0 80 80" fill="none" className="h-16 w-16 sm:h-20 sm:w-20">
      {/* Issue card 1 */}
      <rect x="6" y="10" width="30" height="20" rx="3" stroke={muted} strokeWidth="1.2" opacity="0.3" />
      <rect x="10" y="15" width="18" height="2.5" rx="1" fill={muted} opacity="0.2" />
      <rect x="10" y="20" width="12" height="2.5" rx="1" fill={muted} opacity="0.15" />
      {/* Issue card 2 (similar — will merge) */}
      <rect x="40" y="10" width="30" height="20" rx="3" stroke={muted} strokeWidth="1.2" opacity="0.3">
        <animate attributeName="x" values="40;40;24;24" dur="3s" begin="0.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.3;0.3;0;0" dur="3s" begin="0.5s" repeatCount="indefinite" />
      </rect>
      <rect x="44" y="15" width="18" height="2.5" rx="1" fill={muted} opacity="0.2">
        <animate attributeName="x" values="44;44;28;28" dur="3s" begin="0.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.2;0.2;0;0" dur="3s" begin="0.5s" repeatCount="indefinite" />
      </rect>
      <rect x="44" y="20" width="12" height="2.5" rx="1" fill={muted} opacity="0.15">
        <animate attributeName="x" values="44;44;28;28" dur="3s" begin="0.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.15;0.15;0;0" dur="3s" begin="0.5s" repeatCount="indefinite" />
      </rect>
      {/* Merge arrows */}
      <path d="M32 20 L38 20" stroke={primary} strokeWidth="1.5" strokeLinecap="round" opacity="0">
        <animate attributeName="opacity" values="0;0.6;0.6;0" dur="3s" begin="0.5s" repeatCount="indefinite" />
      </path>
      {/* Equals / duplicate badge */}
      <g opacity="0">
        <animate attributeName="opacity" values="0;0;1;1" dur="3s" begin="0.5s" repeatCount="indefinite" />
        <rect x="30" y="14" width="20" height="12" rx="6" fill={primary} opacity="0.15" />
        <text x="40" y="22" textAnchor="middle" fill={primary} fontSize="6" fontWeight="700" fontFamily="system-ui">
          =
        </text>
      </g>
      {/* Result: single clean issue */}
      <rect x="16" y="42" width="40" height="28" rx="4" stroke={primary} strokeWidth="1.2" opacity="0">
        <animate attributeName="opacity" values="0;0;0;0.6" dur="3s" begin="0.5s" repeatCount="indefinite" />
      </rect>
      <rect x="22" y="48" width="24" height="2.5" rx="1" fill={primary} opacity="0">
        <animate attributeName="opacity" values="0;0;0;0.5" dur="3s" begin="0.5s" repeatCount="indefinite" />
      </rect>
      <rect x="22" y="53" width="28" height="2.5" rx="1" fill={primary} opacity="0">
        <animate attributeName="opacity" values="0;0;0;0.3" dur="3s" begin="0.5s" repeatCount="indefinite" />
      </rect>
      <rect x="22" y="58" width="20" height="2.5" rx="1" fill={primary} opacity="0">
        <animate attributeName="opacity" values="0;0;0;0.3" dur="3s" begin="0.5s" repeatCount="indefinite" />
      </rect>
      {/* Comment indicator on result */}
      <g opacity="0">
        <animate attributeName="opacity" values="0;0;0;0.6" dur="3s" begin="0.5s" repeatCount="indefinite" />
        <rect x="22" y="63" width="14" height="4" rx="2" fill={primary} opacity="0.12" />
        <text x="29" y="66.5" textAnchor="middle" fill={primary} fontSize="3.5" fontFamily="system-ui">
          +2
        </text>
      </g>
    </svg>
  );
}
