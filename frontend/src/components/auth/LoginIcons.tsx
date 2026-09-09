/** Mesmo ícone do logo da sidebar (Layout) */
export function LogoIcon({ color = "var(--cor-principal)" }: { color?: string }) {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="4" cy="28" r="4" fill={color} />
      <circle cx="12" cy="28" r="4" fill={color} />
      <circle cx="20" cy="28" r="4" fill={color} />
      <circle cx="28" cy="28" r="4" fill={color} />
      <circle cx="12" cy="20" r="4" fill={color} />
      <circle cx="20" cy="20" r="4" fill={color} />
      <circle cx="28" cy="20" r="4" fill={color} />
      <circle cx="20" cy="12" r="4" fill={color} />
      <circle cx="28" cy="12" r="4" fill={color} />
      <circle cx="28" cy="4" r="4" fill={color} />
    </svg>
  );
}

export function LoginArtwork() {
  return (
    <svg
      className="page-login__art"
      viewBox="0 0 600 600"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <g className="page-login__art-rings">
        {[90, 135, 180, 225, 270, 315].map((radius) => (
          <circle key={radius} cx="365" cy="340" r={radius} />
        ))}
      </g>
      <g className="page-login__art-dots">
        <circle cx="118" cy="537" r="7" />
        <circle cx="153" cy="519" r="10" />
        <circle cx="195" cy="505" r="13" />
        <circle cx="240" cy="484" r="17" />
        <circle cx="289" cy="455" r="22" />
        <circle cx="335" cy="410" r="30" />
        <circle cx="366" cy="345" r="22" />
        <circle cx="375" cy="286" r="17" />
        <circle cx="382" cy="234" r="13" />
        <circle cx="389" cy="189" r="10" />
        <circle cx="397" cy="147" r="8" />
        <circle cx="405" cy="104" r="7" />
      </g>
    </svg>
  );
}

export function ChartFeatureIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M3 3v18h18" />
      <path d="M7 16v-5" />
      <path d="M12 16V8" />
      <path d="M17 16v-3" />
    </svg>
  );
}

export function MailFeatureIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m2 7 10 7 10-7" />
    </svg>
  );
}

export function ShieldFeatureIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

export function SecureIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export function UserIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export function LockIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export function EyeIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function EyeOffIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <path d="M1 1l22 22" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
    </svg>
  );
}
