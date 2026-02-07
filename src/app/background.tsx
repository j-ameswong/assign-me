"use client";

import { useEffect, useRef } from "react";

const SQUARE_COUNT = 15;

interface Square {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  color: string;
}

const COLORS = ["#6f1d1b", "#bb9457", "#99582a", "#432818", "#ffe6a7"];

export default function Background() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;

    function resize() {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    const squares: Square[] = Array.from({ length: SQUARE_COUNT }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: 30 + Math.random() * 80,
      speedX: (Math.random() - 0.5) * 0.4,
      speedY: (Math.random() - 0.5) * 0.4,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.003,
      opacity: 0.06 + Math.random() * 0.1,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }));

    function draw() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);

      for (const sq of squares) {
        sq.x += sq.speedX;
        sq.y += sq.speedY;
        sq.rotation += sq.rotationSpeed;

        // Wrap around edges
        if (sq.x > canvas!.width + sq.size) sq.x = -sq.size;
        if (sq.x < -sq.size) sq.x = canvas!.width + sq.size;
        if (sq.y > canvas!.height + sq.size) sq.y = -sq.size;
        if (sq.y < -sq.size) sq.y = canvas!.height + sq.size;

        ctx!.save();
        ctx!.translate(sq.x, sq.y);
        ctx!.rotate(sq.rotation);
        ctx!.globalAlpha = sq.opacity;
        ctx!.fillStyle = sq.color;
        ctx!.fillRect(-sq.size / 2, -sq.size / 2, sq.size, sq.size);
        ctx!.restore();
      }

      animationId = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 -z-10"
      aria-hidden="true"
    />
  );
}
