// --------------------------------------------------
// Grammar Drive — lightweight road-trip sound system
// Web Audio synthesis only; no external files or downloads.
// --------------------------------------------------

let audioContext = null;
let masterGain = null;
let engineOscillator = null;
let engineGain = null;
let ambienceGain = null;
let muted = false;
let volumeLevel = 0.75;
let lastEngineUpdate = 0;

try {
  muted = localStorage.getItem("gd_sound_muted") === "true";
  const savedRaw = localStorage.getItem("gd_sound_volume");
  if (savedRaw !== null) {
    const savedVolume = Number(savedRaw);
    if (Number.isFinite(savedVolume)) volumeLevel = Math.max(0, Math.min(1, savedVolume));
  }
} catch (error) {}

function ensureAudio() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!audioContext) {
    audioContext = new AudioContextClass();
    masterGain = audioContext.createGain();
    masterGain.gain.value = muted ? 0 : volumeLevel;
    masterGain.connect(audioContext.destination);

    // A single looping filtered-noise bed creates a soft road/wind ambience.
    // It uses one source node and a short in-memory buffer, keeping CPU use low.
    const bufferLength = Math.max(1, Math.floor(audioContext.sampleRate * 2));
    const noiseBuffer = audioContext.createBuffer(1, bufferLength, audioContext.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferLength; i++) noiseData[i] = (Math.random() * 2 - 1) * 0.22;

    const wind = audioContext.createBufferSource();
    wind.buffer = noiseBuffer;
    wind.loop = true;
    const windFilter = audioContext.createBiquadFilter();
    windFilter.type = "lowpass";
    windFilter.frequency.value = 420;
    windFilter.Q.value = 0.35;
    ambienceGain = audioContext.createGain();
    ambienceGain.gain.value = 0.045;
    wind.connect(windFilter);
    windFilter.connect(ambienceGain);
    ambienceGain.connect(masterGain);
    wind.start();

    engineOscillator = audioContext.createOscillator();
    engineOscillator.type = "triangle";
    const engineFilter = audioContext.createBiquadFilter();
    engineFilter.type = "lowpass";
    engineFilter.frequency.value = 520;
    engineGain = audioContext.createGain();
    engineGain.gain.value = 0;
    engineOscillator.connect(engineFilter);
    engineFilter.connect(engineGain);
    engineGain.connect(masterGain);
    engineOscillator.start();
  }

  if (audioContext.state === "suspended") audioContext.resume().catch(() => {});
  return audioContext;
}

export function initAudio() {
  ensureAudio();
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
    purchase: [440, 660, 880],
    repair: [392, 523, 659],
    mission: [523, 659, 784, 988, 1175]
  };
  const notes = patterns[name] || patterns.click;
  const now = ctx.currentTime;

  notes.forEach((frequency, index) => {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = name === "wrong" ? "triangle" : "sine";
    oscillator.frequency.setValueAtTime(frequency, now + index * 0.075);
    gain.gain.setValueAtTime(0.0001, now + index * 0.075);
    gain.gain.exponentialRampToValueAtTime(0.13, now + index * 0.075 + 0.012);
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
  const targetGain = velocity < 8 ? 0.0001 : Math.min(0.065, 0.01 + velocity / 9000) * (accelerating ? 1 : 0.58);

  engineOscillator.frequency.setTargetAtTime(targetFrequency, now, 0.12);
  engineGain.gain.setTargetAtTime(targetGain, now, 0.16);
}

export function stopEngineSound() {
  if (engineGain && audioContext) {
    engineGain.gain.setTargetAtTime(0, audioContext.currentTime, 0.08);
  }
}
