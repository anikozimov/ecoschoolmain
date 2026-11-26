import { useId } from "react";

const G = "#1d7438";

/** Globus, barglar, nihol va kitob — emblemaning ichki qismi (200×200 koordinatalarda) */
function Inner({ p }: { p: string }) {
  return (
    <>
      <path d="M100 146 C72 146 51 128 49 94 C75 96 96 116 100 146 Z" fill={`url(#${p}a)`} />
      <path d="M100 146 C86 129 70 112 49 94" stroke="#17602d" strokeWidth="1.5" fill="none" opacity="0.55" />
      <path d="M100 146 C128 146 149 128 151 94 C125 96 104 116 100 146 Z" fill={`url(#${p}b)`} />
      <path d="M100 146 C114 129 130 112 151 94" stroke="#17602d" strokeWidth="1.5" fill="none" opacity="0.55" />
      <circle cx="100" cy="101" r="26" fill={`url(#${p}g)`} />
      <g clipPath={`url(#${p}c)`}>
        <g fill="#2a8a45">
          <path d="M77 87 C81 80 89 77 96 79 C99 83 95 87 92 89 C89 92 90 96 86 98 C82 97 79 94 76 92 Z" />
          <path d="M89 101 C95 100 97 105 95 111 C94 116 91 121 87 125 C85 119 86 113 85 108 C84 104 86 101 89 101 Z" />
          <path d="M104 81 C108 78 114 79 116 82 C114 85 110 86 108 88 C111 90 115 93 116 98 C116 104 113 110 110 116 C108 119 105 118 104 114 C103 108 101 103 102 97 C103 93 101 88 104 82 Z" />
          <path d="M118 83 C122 84 126 88 127 93 C124 95 121 93 118 92 C116 90 116 86 118 83 Z" />
        </g>
        <ellipse cx="100" cy="101" rx="26" ry="8" fill="none" stroke={G} strokeWidth="0.9" opacity="0.35" />
        <ellipse cx="100" cy="101" rx="11" ry="26" fill="none" stroke={G} strokeWidth="0.9" opacity="0.35" />
      </g>
      <circle cx="100" cy="101" r="26" fill="none" stroke={G} strokeWidth="2.4" />
      <path d="M100 75 V54" stroke={G} strokeWidth="2.8" strokeLinecap="round" />
      <path d="M100 66 C96 57 88 54 79 55 C81 64 89 68 100 66 Z" fill="#5cb85a" />
      <path d="M100 61 C104 52 112 49 121 50 C119 59 111 63 100 61 Z" fill={G} />
      <path d="M100 55 C96.5 49 97.5 43 100 39 C102.5 43 103.5 49 100 55 Z" fill="#5cb85a" />
      <g stroke={G} strokeWidth="2.1" strokeLinejoin="round" fill="#ffffff">
        <path d="M100 143 C89 136 73 135 61 138 V155 C73 152 89 153 100 160 Z" />
        <path d="M100 143 C111 136 127 135 139 138 V155 C127 152 111 153 100 160 Z" />
      </g>
      <path
        d="M67 144 C76 142 85 143 93 146 M67 149.5 C76 147.5 85 148.5 93 151.5 M133 144 C124 142 115 143 107 146 M133 149.5 C124 147.5 115 148.5 107 151.5"
        stroke={G}
        strokeWidth="1.15"
        fill="none"
        opacity="0.55"
      />
    </>
  );
}

function Defs({ p }: { p: string }) {
  return (
    <defs>
      <path id={`${p}t`} d="M31 100 A69 69 0 0 1 169 100" />
      <path id={`${p}u`} d="M24 100 A76 76 0 0 0 176 100" />
      <clipPath id={`${p}c`}>
        <circle cx="100" cy="101" r="26" />
      </clipPath>
      <linearGradient id={`${p}a`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#9ad874" />
        <stop offset="1" stopColor="#2f9447" />
      </linearGradient>
      <linearGradient id={`${p}b`} x1="1" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#9ad874" />
        <stop offset="1" stopColor="#2f9447" />
      </linearGradient>
      <radialGradient id={`${p}g`} cx="0.38" cy="0.35" r="0.75">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="1" stopColor="#d6efcc" />
      </radialGradient>
    </defs>
  );
}

/**
 * ECO SCHOOL emblemasi.
 * full — yozuvli to‘liq emblema (sertifikat, katta joylar);
 * mini — kichik o‘lchamlar uchun (logo, ikonka): yozuvsiz, oq doira ichida.
 */
export function Emblem({ variant = "full", className = "", title = "ECO SCHOOL" }: { variant?: "full" | "mini"; className?: string; title?: string }) {
  const p = "em" + useId().replace(/[^a-zA-Z0-9]/g, "");
  if (variant === "mini") {
    return (
      <svg viewBox="0 0 200 200" className={className} role="img" aria-label={title}>
        <Defs p={p} />
        <circle cx="100" cy="100" r="98" fill={G} />
        <circle cx="100" cy="100" r="91" fill="#ffffff" />
        <g transform="translate(100 100) scale(1.2) translate(-100 -99.5)">
          <Inner p={p} />
        </g>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 200 200" className={className} role="img" aria-label={title}>
      <Defs p={p} />
      <circle cx="100" cy="100" r="99" fill={G} />
      <circle cx="100" cy="100" r="95" fill="#ffffff" />
      <circle cx="100" cy="100" r="91" fill="none" stroke={G} strokeWidth="1.6" />
      <path d="M15.1 104 A85 85 0 0 0 184.9 104 L157.9 104 A58 58 0 0 1 42.1 104 Z" fill={G} />
      <text fontFamily="Montserrat, 'Onest Variable', Arial, sans-serif" fontWeight="800" fontSize="19" letterSpacing="2.6" textAnchor="middle" fill={G}>
        <textPath href={`#${p}t`} startOffset="50%">ECO SCHOOL</textPath>
      </text>
      <text fontFamily="Montserrat, 'Onest Variable', Arial, sans-serif" fontWeight="700" fontSize="7.8" letterSpacing="2.1" textAnchor="middle" fill="#ffffff">
        <textPath href={`#${p}u`} startOffset="50%">MEASURE · ACT · IMPROVE</textPath>
      </text>
      <g fill={G}>
        <path d="M20 94 C20 86 25 81 32 80 C32 88 27 93 20 94 Z" />
        <path d="M180 94 C180 86 175 81 168 80 C168 88 173 93 180 94 Z" />
      </g>
      <path d="M20 94 C24 89 28 85 32 80 M180 94 C176 89 172 85 168 80" stroke="#ffffff" strokeWidth="0.9" fill="none" />
      <Inner p={p} />
    </svg>
  );
}
