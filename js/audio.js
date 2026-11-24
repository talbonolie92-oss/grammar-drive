// --------------------------------------------------
// Grammar Drive 2.0 — lightweight playful sound system
// Uses Web Audio synthesis; no external audio files or downloads.
// --------------------------------------------------

let audioContext = null;
let masterGain = null;
let engineOscillator = null;
let engineGain = null;
let muted = false;
let volumeLevel = 0.55;
let lastEngineUpdate = 0;
let musicEnabled = true;
let musicTimer = null;
let musicStep = 0;

try {
  muted = localStorage.getItem("gd_sound_muted") === "true";
  musicEnabled = localStorage.getItem("gd_music_enabled") !== "false";
  const savedVolume = Number(localStorage.getItem("gd_sound_volume"));
  if (Number.isFinite(savedVolume)) volumeLevel = Math.max(0, Math.min(1, savedVolume));
} catch (error) {}

function ensureAudio() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!audioContext) {
    audioContext = new AudioContextClass();
    masterGain = audioContext.createGain();
    masterGain.gain.value = muted ? 0 : volumeLevel;
    masterGain.connect(audioContext.destination);

    engineOscillator = audioContext.createOscillator();
    engineOscillator.type = "triangle";
    const filter = audioContext.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 520;
    engineGain = audioContext.createGain();
    engineGain.gain.value = 0;
    engineOscillator.connect(filter);
    filter.connect(engineGain);
    engineGain.connect(masterGain);
    engineOscillator.start();
  }

  if (audioContext.state === "suspended") {
    audioContext.resume().catch(() => {});
  }
  return audioContext;
}

export function initAudio() {
  ensureAudio();
  if (musicEnabled) startBackgroundMusic();
}

const MUSIC_MELODY = [523, 659, 784, 659, 587, 698, 880, 698, 523, 659, 784, 1047, 880, 784, 659, 523];
const MUSIC_BASS = [131, 131, 165, 165, 147, 147, 175, 175, 131, 131, 165, 165, 147, 147, 175, 175];

function musicTone(frequency, startAt, duration, level, type) {
  if (!audioContext || !masterGain || muted) return;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startAt);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(level, startAt + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  oscillator.connect(gain);
  gain.connect(masterGain);
  oscillator.start(startAt);
  oscillator.stop(startAt + duration + 0.02);
}

function playMusicStep() {
  if (!musicEnabled || !audioContext || muted) return;
  const now = audioContext.currentTime + 0.025;
  const index = musicStep % MUSIC_MELODY.length;
  musicTone(MUSIC_MELODY[index], now, 0.24, 0.022, "triangle");
  if (musicStep % 2 === 0) musicTone(MUSIC_BASS[index], now, 0.34, 0.012, "sine");
  musicStep += 1;
}

export function startBackgroundMusic() {
  const ctx = ensureAudio();
  if (!ctx || !musicEnabled || musicTimer) return;
  musicStep = 0;
  playMusicStep();
  musicTimer = setInterval(playMusicStep, 300);
}

export function stopBackgroundMusic() {
  if (musicTimer) {
    clearInterval(musicTimer);
    musicTimer = null;
  }
}

export function setMusicEnabled(value) {
  musicEnabled = !!value;
  try { localStorage.setItem("gd_music_enabled", String(musicEnabled)); } catch (error) {}
  if (musicEnabled) startBackgroundMusic();
  else stopBackgroundMusic();
  return musicEnabled;
}

export function toggleMusic() {
  return setMusicEnabled(!musicEnabled);
}

export function isMusicEnabled() {
  return musicEnabled;
}

export function setMuted(value) {
  muted = !!value;
  try { localStorage.setItem("gd_sound_muted", String(muted)); } catch (error) {}
  if (masterGain && audioContext) {
    masterGain.gain.setTargetAtTime(muted ? 0 : volumeLevel, audioContext.currentTime, 0.04);
  }
  return muted;
}

export function setVolume(value) {
  volumeLevel = Math.max(0, Math.min(1, Number(value) || 0));
  try { localStorage.setItem("gd_sound_volume", String(volumeLevel)); } catch (error) {}
  if (masterGain && audioContext) {
    masterGain.gain.setTargetAtTime(muted ? 0 : volumeLevel, audioContext.currentTime, 0.04);
  }
  return volumeLevel;
}

export function getVolume() {
  return volumeLevel;
}

export function isMuted() {
  return muted;
}

export function toggleMuted() {
  return setMuted(!muted);
}

export function playSfx(name) {
  const ctx = ensureAudio();
  if (!ctx || muted || !masterGain) return;

  const patterns = {
    click: [520, 680],
    collect: [660, 880, 1120],
    correct: [523, 659, 784, 1047],
    wrong: [260, 210],
    reward: [660, 784, 988, 1318],
    evolve: [392, 523, 659, 784, 1047, 1318],
    purchase: [440, 660, 880],
    repair: [392, 523, 659],
    mission: [523, 659, 784, 988, 1175]
  };
  const notes = patterns[name] || patterns.click;
  const now = ctx.currentTime;

  notes.forEach((frequency, index) => {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = name === "wrong" || name === "evolve" ? "triangle" : "sine";
    oscillator.frequency.setValueAtTime(frequency, now + index * 0.075);
    gain.gain.setValueAtTime(0.0001, now + index * 0.075);
    gain.gain.exponentialRampToValueAtTime(0.16, now + index * 0.075 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.075 + 0.19);
    oscillator.connect(gain);
    gain.connect(masterGain);
    oscillator.start(now + index * 0.075);
    oscillator.stop(now + index * 0.075 + 0.21);
  });
}

export function updateEngineSound(speed, accelerating = false) {
  if (!engineOscillator || !engineGain || !audioContext || muted) return;
  const now = audioContext.currentTime;
  if (now - lastEngineUpdate < 0.08) return;
  lastEngineUpdate = now;

  const velocity = Math.max(0, Math.min(520, Math.abs(Number(speed) || 0)));
  const targetFrequency = 48 + velocity * 0.42 + (accelerating ? 16 : 0);
  const targetGain = velocity < 8 ? 0.0001 : Math.min(0.055, 0.008 + velocity / 10500) * (accelerating ? 1 : 0.58);

  engineOscillator.frequency.setTargetAtTime(targetFrequency, now, 0.12);
  engineGain.gain.setTargetAtTime(targetGain, now, 0.16);
}

export function stopEngineSound() {
  if (engineGain && audioContext) {
    engineGain.gain.setTargetAtTime(0, audioContext.currentTime, 0.08);
  }
}
