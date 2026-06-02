"use client";

import { useEffect, useState } from "react";

type TimeLeft = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

function computeTimeLeft(unveilingAt: string): TimeLeft | null {
  const diff = new Date(unveilingAt).getTime() - Date.now();
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
  };
}

export default function CoverCountdown({
  unveilingAt,
  countdownLabel,
  completeMessage,
  completeSubtext,
}: {
  unveilingAt: string;
  countdownLabel: string;
  completeMessage: string;
  completeSubtext: string;
}) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(() =>
    computeTimeLeft(unveilingAt)
  );

  useEffect(() => {
    const id = setInterval(() => setTimeLeft(computeTimeLeft(unveilingAt)), 1000);
    return () => clearInterval(id);
  }, [unveilingAt]);

  if (timeLeft === null) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <p
          className="text-3xl sm:text-4xl font-black text-tiki-brown"
          style={{ fontFamily: "var(--font-bubblegum-sans)" }}
        >
          {completeMessage}
        </p>
        <p className="text-tiki-brown/60 text-base sm:text-lg max-w-md">
          {completeSubtext}
        </p>
      </div>
    );
  }

  const units = [
    { label: "Days", value: timeLeft.days },
    { label: "Hours", value: timeLeft.hours },
    { label: "Minutes", value: timeLeft.minutes },
    { label: "Seconds", value: timeLeft.seconds },
  ];

  return (
    <div className="flex flex-col items-center gap-5">
      <p className="text-xs font-bold text-tiki-brown/50 uppercase tracking-widest">
        {countdownLabel}
      </p>
      <div className="flex items-end gap-3 sm:gap-5">
        {units.map(({ label, value }, i) => (
          <div key={label} className="flex items-end gap-1 sm:gap-2">
            <div className="flex flex-col items-center">
              <span
                className="text-5xl sm:text-7xl font-black tabular-nums leading-none text-tiki-brown"
                style={{ fontFamily: "var(--font-bubblegum-sans)" }}
              >
                {String(value).padStart(2, "0")}
              </span>
              <span className="text-[10px] sm:text-xs font-bold text-tiki-brown/40 uppercase tracking-widest mt-1.5">
                {label}
              </span>
            </div>
            {i < units.length - 1 && (
              <span
                className="text-4xl sm:text-6xl font-black text-tiki-brown/20 pb-6"
                style={{ fontFamily: "var(--font-bubblegum-sans)" }}
              >
                :
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
