"use strict";
/* ---------------- FSRS (v4.5, paràmetres per defecte) ---------------- */
const W = [0.4872, 1.4003, 3.7145, 13.8206, 5.1618, 1.2298, 0.8975, 0.031, 1.6474, 0.1367, 1.0461, 2.1072, 0.0793, 0.3246, 1.587, 0.2272, 2.8755];
const DECAY = -0.5, FACTOR = 19 / 81;
const clampD = d => Math.min(10, Math.max(1, d));
const retr = (t, S) => Math.pow(1 + FACTOR * t / S, DECAY);
const d0 = g => clampD(W[4] - (g - 3) * W[5]);
function fsrs(card, g, t = now()) {
  // g: 1 Again, 2 Hard, 3 Good, 4 Easy
  if (!card.reps) { card.S = W[g - 1]; card.D = d0(g); }
  else {
    const el = Math.max(0, (t - card.last) / DAY), R = retr(el, card.S);
    card.D = clampD(W[7] * d0(3) + (1 - W[7]) * (card.D - W[6] * (g - 3)));
    if (g === 1) card.S = Math.min(card.S, W[11] * Math.pow(card.D, -W[12]) * (Math.pow(card.S + 1, W[13]) - 1) * Math.exp(W[14] * (1 - R)));
    else if (el >= 0.5) card.S = card.S * (Math.exp(W[8]) * (11 - card.D) * Math.pow(card.S, -W[9]) * (Math.exp(W[10] * (1 - R)) - 1) * (g === 2 ? W[15] : 1) * (g === 4 ? W[16] : 1) + 1);
  }
  card.S = Math.max(0.1, card.S);
  card.reps = (card.reps || 0) + 1; if (g === 1) card.lapses = (card.lapses || 0) + 1;
  card.last = t;
  card.due = g === 1 ? t + 10 * 60e3 : t + Math.max(1, Math.round(card.S)) * DAY;
}

