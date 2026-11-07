import { useEffect, useState } from 'react';

export default function ClockCard() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const time = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return (
    <div className="pb-8">
      <p
        className="text-[84px] leading-none font-light tracking-[-0.05em] tabular-nums"
        aria-label={`Current time ${time}`}
      >
        {time}
      </p>
      <p className="mt-3 text-[15px] text-mute">
        {now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
      </p>
    </div>
  );
}
