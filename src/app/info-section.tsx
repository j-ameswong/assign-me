"use client";

import { useEffect, useRef, useState } from "react";

const steps = [
  {
    number: "1",
    title: "Create an Event",
    description:
      "Set up your event with a title, description, and a list of options, each with a capacity. You'll get a secret admin link and a shareable join code.",
  },
  {
    number: "2",
    title: "Share the Join Code",
    description:
      "Give participants the join code or link. They can enter it on the homepage to find your event.",
  },
  {
    number: "3",
    title: "Participants Rank Options",
    description:
      "Each participant submits a ranked list of their preferred options via drag-and-drop. Earlier submissions get priority.",
  },
  {
    number: "4",
    title: "Run the Allocation",
    description:
      "Close submissions and run the algorithm. It assigns each participant to their highest-ranked option that still has capacity. First come, first served!",
  },
];

export function ScrollArrow() {
  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 animate-bounce">
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        className="text-secondary/40"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M7 13l5 5 5-5" />
        <path d="M7 6l5 5 5-5" />
      </svg>
    </div>
  );
}

export default function InfoSection() {
  const [visible, setVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={sectionRef} className="w-full max-w-2xl mx-auto px-6 pb-24 pt-8">
      <div
        className={`transition-all duration-700 ${
          visible
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-8"
        }`}
      >
        <h2 className="text-3xl font-bold text-primary text-center mb-2">
          How It Works
        </h2>
        <p className="text-center text-muted mb-12">
          Fair allocation in four simple steps.
        </p>

        <div className="flex flex-col gap-8">
          {steps.map((step, i) => (
            <div
              key={step.number}
              className={`flex gap-5 items-start transition-all duration-500 ${
                visible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-6"
              }`}
              style={{ transitionDelay: visible ? `${200 + i * 150}ms` : "0ms" }}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-white font-bold text-lg">
                {step.number}
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-lg">
                  {step.title}
                </h3>
                <p className="text-muted mt-1">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div
          className={`mt-14 rounded-xl border border-border bg-surface/60 p-6 text-center transition-all duration-500 ${
            visible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-6"
          }`}
          style={{ transitionDelay: visible ? "900ms" : "0ms" }}
        >
          <h3 className="font-semibold text-foreground text-lg mb-2">
            Serial Dictatorship Algorithm
          </h3>
          <p className="text-muted text-sm leading-relaxed">
            Participants are processed in submission order. Each person gets
            their highest-ranked option that still has room. The algorithm is
            strategy-proof — there&apos;s no benefit to gaming the system — and
            deterministic, so the same inputs always produce the same results.
          </p>
        </div>
      </div>
    </div>
  );
}
