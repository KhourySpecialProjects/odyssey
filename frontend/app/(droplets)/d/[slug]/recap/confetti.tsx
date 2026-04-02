"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";

export function Confetti() {
  useEffect(() => {
    const canvas = document.createElement("canvas");
    canvas.style.position = "fixed";
    canvas.style.inset = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "999999";
    document.body.appendChild(canvas);

    const myConfetti = confetti.create(canvas, { resize: true });

    myConfetti({
      spread: 360,
      ticks: 100,
      gravity: 0,
      decay: 0.94,
      startVelocity: 30,
      shapes: ["circle"],
      colors: ["#297496"],
      particleCount: 1000,
    });

    const timer = setTimeout(() => canvas.remove(), 5000);

    return () => {
      clearTimeout(timer);
      canvas.remove();
    };
  }, []);

  return null;
}
