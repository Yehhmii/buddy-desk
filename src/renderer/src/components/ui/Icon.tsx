const PATHS = {
  today:
    'M5 4.5h14a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18V6A1.5 1.5 0 0 1 5 4.5ZM8 9.5l1.7 1.7L13 8M8 15h8',
  alarm: 'M12 8v4.2l2.6 1.6M12 20a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM4.5 6.5 7 4M19.5 6.5 17 4',
  report:
    'M7 3.5h7l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-9.5A1.5 1.5 0 0 1 5.5 19V5A1.5 1.5 0 0 1 7 3.5ZM13.5 3.5V8h4.5M8.5 12.5h7M8.5 16h5',
  settings: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 4.5v5M9 14.5v5',
  mic: 'M12 15.5a3 3 0 0 0 3-3V7a3 3 0 0 0-6 0v5.5a3 3 0 0 0 3 3ZM6.5 12a5.5 5.5 0 0 0 11 0M12 17.5V21',
  plus: 'M12 5v14M5 12h14',
  check: 'm5 12.5 4.5 4.5L19 7.5',
  trash: 'M5 7h14M10 7V5h4v2M7 7l.8 12h8.4L17 7',
  screen: 'M4 5.5h16v10H4zM9 19.5h6M12 15.5v4',
  send: 'M5 12h13M13 6l6 6-6 6',
  x: 'm6 6 12 12M18 6 6 18',
  camera:
    'M4.5 8.5h3l1.3-2h6.4l1.3 2h3a1 1 0 0 1 1 1V18a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1V9.5a1 1 0 0 1 1-1ZM12 16.5a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z',
  chevron: 'm9 6 6 6-6 6',
} as const;

export type IconName = keyof typeof PATHS;

interface IconProps {
  name: IconName;
  size?: number;
  strokeWidth?: number;
}

export default function Icon({ name, size = 20, strokeWidth = 1.6 }: IconProps) {
  return (
    <svg
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
      <path d={PATHS[name]} />
    </svg>
  );
}
