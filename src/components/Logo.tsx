// The robot from the landing, static (no animation) for the app chrome.
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" className="flex-none">
      <line x1="20" y1="2" x2="20" y2="9" stroke="#D7FF3A" strokeWidth="3" strokeLinecap="round" />
      <circle cx="20" cy="3" r="3" fill="#FF5FA2" />
      <rect x="4" y="9" width="32" height="27" rx="9" fill="#3A56F0" />
      <rect x="9" y="15" width="22" height="14" rx="5" fill="#0E0F13" />
      <circle cx="15" cy="22" r="2.6" fill="#D7FF3A" />
      <circle cx="25" cy="22" r="2.6" fill="#D7FF3A" />
    </svg>
  );
}
