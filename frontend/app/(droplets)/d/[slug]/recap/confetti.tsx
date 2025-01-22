"use client"

import { useEffect } from 'react';
import confetti from 'canvas-confetti';

export function Confetti() {
  useEffect(() => {
    const defaults = {
      spread: 360,
      ticks: 100,
      gravity: 0,
      decay: 0.94,
      startVelocity: 30,
      shapes: ['image'],
      scalar: 1,
    };

    function createCanvas() {
      const canvas = document.createElement('canvas');
      canvas.style.position = 'fixed';
      canvas.style.inset = '0';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.pointerEvents = 'none';
      canvas.style.zIndex = '999999';
      document.body.appendChild(canvas);
      return canvas;
    }

    const canvas = createCanvas();
    const ctx = canvas.getContext('2d');
    const myConfetti = confetti.create(canvas, {
      resize: true
    });

    const image = new Image();
    image.src = '/logo.svg';
    image.onload = () => {
      if (!ctx) return;

      ctx.drawImage(image, 0, 0);
      const pattern = ctx.createPattern(image, 'no-repeat');
      if (!pattern) return;

      myConfetti({
        ...defaults,
        shapes: ['circle'],  // Use built-in shapes instead
        colors: ['#297496'], // Use Oasis colors
        particleCount: 100,
      });
      
      setTimeout(() => {
        canvas.remove();
      }, 5000);
    };

    return () => {
      canvas.remove();
    };
  }, []);

  return null;
}