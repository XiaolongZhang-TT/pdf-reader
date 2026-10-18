import type { CSSProperties, ReactNode } from "react";

const paths: Record<string, ReactNode> = {
  chevronDown: <path d="m6 9 6 6 6-6" />,
  chevronUp: <path d="m6 15 6-6 6 6" />,
  chevronLeft: <path d="m15 18-6-6 6-6" />,
  chevronRight: <path d="m9 18 6-6-6-6" />,
  chevronsLeft: <path d="m11 17-5-5 5-5M18 17l-5-5 5-5" />,
  chevronsRight: <path d="m13 17 5-5-5-5M6 17l5-5-5-5" />,
  chevronDownSmall: <path d="m7 10 5 5 5-5" />,
  close: <path d="M18 6 6 18M6 6l12 12" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </>
  ),
  sidebar: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <path d="M9.5 4v16" />
    </>
  ),
  folder: (
    <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h3.2c.7 0 1.3.3 1.8.8l1 1.2h7A2.5 2.5 0 0 1 21 9.5v7A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5z" />
  ),
  file: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  moon: <path d="M20.5 14.2A8.5 8.5 0 1 1 9.8 3.5a7 7 0 0 0 10.7 10.7Z" />,
  display: (
    <>
      <rect x="3" y="4" width="18" height="13" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </>
  ),
  palette: (
    <path d="M12 3a9 9 0 1 0 0 18c1.4 0 2.2-.9 2.2-2 0-1.2-.9-1.5-.9-2.5s.7-1.5 1.6-1.5H17a4 4 0 0 0 4-4c0-4.4-4-8-9-8Z" />
  ),
  bookmark: <path d="M6.5 3.5h11a1 1 0 0 1 1 1V21l-6.5-4-6.5 4V4.5a1 1 0 0 1 1-1Z" />,
  bookmarkFilled: (
    <path
      d="M6.5 3.5h11a1 1 0 0 1 1 1V21l-6.5-4-6.5 4V4.5a1 1 0 0 1 1-1Z"
      fill="currentColor"
    />
  ),
  highlight: (
    <>
      <path d="m14.5 4.5 5 5-9.5 9.5H5v-5z" />
      <path d="M4 21h16" />
    </>
  ),
  underline: (
    <>
      <path d="M6 4v6.5a6 6 0 0 0 12 0V4" />
      <path d="M5 20h14" />
    </>
  ),
  strikeout: (
    <>
      <path d="M4 12h16" />
      <path d="M7 7.5C7 5.6 8.7 4 11 4h2.5C16 4 17 5.6 17 7" />
      <path d="M7 16.5C7 18.4 8.7 20 11 20h2.5c2.5 0 3.5-1.6 3.5-3" />
    </>
  ),
  note: (
    <path d="M21 14.5a2.5 2.5 0 0 1-2.5 2.5H8l-5 4V5.5A2.5 2.5 0 0 1 5.5 3h13A2.5 2.5 0 0 1 21 5.5z" />
  ),
  notes: (
    <>
      <path d="M21 13a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2z" />
      <path d="M8 8h8M8 11h5" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </>
  ),
  trash: (
    <>
      <path d="M3 6h18M8 6V4h8v2" />
      <path d="M6 6v13a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6" />
      <path d="M10 10v7M14 10v7" />
    </>
  ),
  pencil: (
    <>
      <path d="M15 5l4 4" />
      <path d="M4 20l4.5-1L20 7.5 16.5 4 5 15.5z" />
    </>
  ),
  rotate: (
    <>
      <path d="M20.5 12a8.5 8.5 0 1 1-2.6-6.1" />
      <path d="M20.5 3.5V9H15" />
    </>
  ),
  fitWidth: (
    <>
      <path d="M4 6v12M20 6v12" />
      <path d="M8 12h8" />
      <path d="m10.5 9.5-2.5 2.5 2.5 2.5M13.5 9.5l2.5 2.5-2.5 2.5" />
    </>
  ),
  fitPage: (
    <>
      <path d="M4 9V5a1 1 0 0 1 1-1h4M20 9V5a1 1 0 0 0-1-1h-4M4 15v4a1 1 0 0 0 1 1h4M20 15v4a1 1 0 0 1-1 1h-4" />
    </>
  ),
  continuous: (
    <>
      <rect x="7" y="2.5" width="10" height="7" rx="1.2" />
      <rect x="7" y="12" width="10" height="9.5" rx="1.2" />
    </>
  ),
  singlePage: <rect x="5.5" y="3" width="13" height="18" rx="1.5" />,
  list: (
    <>
      <path d="M8 6h13M8 12h13M8 18h13" />
      <path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
    </>
  ),
  grid: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1" />
    </>
  ),
  more: (
    <>
      <circle cx="5" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  moreVertical: (
    <>
      <circle cx="12" cy="5" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="12" cy="19" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5M12 8h.01" />
    </>
  ),
  check: <path d="m4.5 12.5 5 5 10-11" />,
  external: (
    <>
      <path d="M14 4h6v6" />
      <path d="M20 4 11 13" />
      <path d="M19 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </>
  ),
  zoomIn: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3M8 11h6M11 8v6" />
    </>
  ),
  zoomOut: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3M8 11h6" />
    </>
  ),
  layers: (
    <>
      <path d="m12 3 9 5-9 5-9-5z" />
      <path d="m3 13 9 5 9-5" />
    </>
  ),
  textSelect: (
    <>
      <path d="M5 4h14M5 20h14M12 4v16" />
      <path d="M8 4v3M16 4v3M8 20v-3M16 20v-3" />
    </>
  ),
  language: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.2 2.3 3.4 5.3 3.4 8.5s-1.2 6.2-3.4 8.5c-2.2-2.3-3.4-5.3-3.4-8.5S9.8 5.8 12 3.5Z" />
    </>
  ),
  arrowDown: <path d="M12 4v16m0 0 6-6m-6 6-6-6" />,
  arrowUp: <path d="M12 20V4m0 0 6 6m-6-6-6 6" />,
  cornerUpRight: <path d="M14 5h5v5M19 5 9 15M5 19v-4a2 2 0 0 1 2-2h2" />,
};

export type IconName = keyof typeof paths;

export function Icon({
  name,
  size = 18,
  strokeWidth = 1.7,
  className,
  style,
}: {
  name: IconName;
  size?: number | string;
  strokeWidth?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      className={className}
      style={style}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

export function PaperMark({ size = 64 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="paper-mark-bg" x1="8" y1="4" x2="56" y2="60">
          <stop offset="0" stopColor="#5AC8FA" />
          <stop offset="0.55" stopColor="#0A84FF" />
          <stop offset="1" stopColor="#5E5CE6" />
        </linearGradient>
        <linearGradient id="paper-mark-page" x1="20" y1="16" x2="44" y2="48">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.98" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0.82" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="15" fill="url(#paper-mark-bg)" />
      <rect
        x="19"
        y="13"
        width="26"
        height="38"
        rx="3.5"
        fill="url(#paper-mark-page)"
      />
      <rect x="24" y="21" width="16" height="2.4" rx="1.2" fill="#0A84FF" opacity="0.55" />
      <rect x="24" y="27" width="12" height="2.4" rx="1.2" fill="#0A84FF" opacity="0.4" />
      <rect x="24" y="33" width="16" height="2.4" rx="1.2" fill="#0A84FF" opacity="0.3" />
      <rect x="24" y="39" width="9" height="2.4" rx="1.2" fill="#0A84FF" opacity="0.22" />
      <path
        d="M19 13h26v38H19z"
        stroke="#ffffff"
        strokeOpacity="0.5"
        strokeWidth="0.8"
      />
    </svg>
  );
}
