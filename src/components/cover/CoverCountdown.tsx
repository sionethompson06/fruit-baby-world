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

  // Countdown expired — show completion message, NOT the website
  if (timeLeft === null) {
    return (
      <section aria-label="Unveiling status" className="flex flex-col items-center gap-3 text-center px-4">
        <p
          className="text-3xl sm:text-5xl font-black text-tiki-brown"
          style={{ fontFamily: "var(--font-bubblegum-sans)" }}
        >
          {completeMessage}
        </p>
        <p className="text-tiki-brown/60 text-base sm:text-lg max-w-md leading-relaxed">
          {completeSubtext}
        </p>
      </section>
    );
  }

  const units = [
    { label: "Days", value: timeLeft.days },
    { label: "Hours", value: timeLeft.hours },
    { label: "Minutes", value: timeLeft.minutes },
    { label: "Seconds", value: timeLeft.seconds },
  ];

  return (
    <section aria-label="Countdown to launch">
      <p className="text-xs font-bold text-tiki-brown/50 uppercase tracking-widest mb-5 text-center">
        {countdownLabel}
      </p>
      <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
        {units.map(({ label, value }) => (
          <div key={label} className="flex flex-col items-center gap-2">
            {/* Card */}
            <div
              className="rounded-2xl flex items-center justify-center min-w-[72px] sm:min-w-[90px] px-3 sm:px-5 py-4 sm:py-5"
              style={{
                background: "rgba(255,255,255,0.70)",
                backdropFilter: "blur(8px)",
                boxShadow:
                  "0 2px 0 rgba(255,216,77,0.18), 0 4px 16px rgba(139,90,43,0.07), inset 0 1px 0 rgba(255,255,255,0.9)",
                border: "1.5px solid rgba(255,216,77,0.22)",
              }}
            >
              <span
                className="text-4xl sm:text-6xl font-black tabular-nums leading-none text-tiki-brown"
                style={{ fontFamily: "var(--font-bubblegum-sans)" }}
                aria-label={`${value} ${label}`}
              >
                {String(value).padStart(2, "0")}
              </span>
            </div>
            {/* Label */}
            <span className="text-[10px] sm:text-xs font-bold text-tiki-brown/50 uppercase tracking-widest">
              {label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
