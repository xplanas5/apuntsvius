"use strict";
/* ---------------- Sons (AudioContext, sense fitxers) i confeti ---------------- */
const Sfx = (() => {
  let ctx = null;
  const ac = () => { if (!ctx) { const A = window.AudioContext || window.webkitAudioContext; if (!A) return null; ctx = new A(); } if (ctx.state === "suspended") ctx.resume(); return ctx; };
  function tone(freq, start, dur, type = "sine", vol = 0.12) {
    const c = ac(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + start;
    o.type = type; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.05);
  }
  const SOUNDS = {
    ok: () => { tone(660, 0, 0.12); tone(880, 0.09, 0.16); },
    bad: () => { tone(220, 0, 0.18, "triangle", 0.1); tone(180, 0.12, 0.2, "triangle", 0.08); },
    combo: () => { [660, 784, 988].forEach((f, i) => tone(f, i * 0.07, 0.14, "square", 0.05)); },
    gold: () => { [784, 988, 1175, 1568].forEach((f, i) => tone(f, i * 0.08, 0.22, "sine", 0.1)); },
    level: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.1, 0.3, "triangle", 0.09)); }
  };
  function play(name) { try { if (S.sound === false || !SOUNDS[name]) return; SOUNDS[name](); } catch { } }
  function confetti() {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const cv = document.createElement("canvas"); cv.className = "confetti"; cv.width = innerWidth; cv.height = innerHeight; document.body.appendChild(cv);
    const g = cv.getContext("2d"), cols = ["#e8b400", "#2a6fdb", "#2e9e5b", "#d6455d", "#8a5cd6"];
    const ps = Array.from({ length: 120 }, () => ({ x: innerWidth / 2 + (Math.random() - 0.5) * 120, y: innerHeight * 0.35, vx: (Math.random() - 0.5) * 12, vy: -Math.random() * 12 - 4, r: Math.random() * 6 + 3, c: pick(cols), a: Math.random() * 6 }));
    let f = 0;
    (function step() {
      g.clearRect(0, 0, cv.width, cv.height);
      ps.forEach(p => { p.vy += 0.35; p.x += p.vx; p.y += p.vy; p.a += 0.2; g.save(); g.translate(p.x, p.y); g.rotate(p.a); g.fillStyle = p.c; g.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); g.restore(); });
      if (++f < 110) requestAnimationFrame(step); else cv.remove();
    })();
    setTimeout(() => cv.remove(), 3000); // si la pestanya passa a segon pla, rAF s'atura
  }
  return { play, confetti };
})();
