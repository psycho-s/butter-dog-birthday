const playButton = document.querySelector("#playButton");
const buttonLabel = document.querySelector(".button-label");
const friendName = document.querySelector("#friendName");
const birthdayLine = document.querySelector("#birthdayLine");
const lyricBoard = document.querySelector("#lyricBoard");
const confettiLayer = document.querySelector("#confettiLayer");

const params = new URLSearchParams(window.location.search);
const nameParam = (params.get("name") || params.get("n") || "").trim();
const lineParam = (params.get("line") || "").trim();
const friend = nameParam ? nameParam.slice(0, 16) : "最好的你";

const lyricLines = [
  "烦恼拜拜",
  "快乐开麦",
  `${friend} 生日嗨嗨`,
  "愿望全都来",
  "今晚你最大",
  "祝你快乐满格",
];

friendName.textContent = friend;
document.title = `${friend}，黄油小狗摇滚生日专场`;
birthdayLine.textContent = lineParam ? lineParam.slice(0, 36) : "今天全场只为你鼓掌。";

let audioContext;
let masterGain;
let guitarGain;
let customAudio;
let showAudio;
let timers = [];
let activeNodes = [];
let isPlaying = false;

const colors = ["#ffd45a", "#00b9ad", "#ff8fb8", "#fff7e0", "#ff4f3f", "#7ed4ff"];

function createAudioContext() {
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtor) return null;

  if (!audioContext) {
    audioContext = new AudioCtor();
    masterGain = audioContext.createGain();
    masterGain.gain.value = 0.76;
    masterGain.connect(audioContext.destination);

    const shaper = audioContext.createWaveShaper();
    const curve = new Float32Array(512);
    for (let i = 0; i < curve.length; i += 1) {
      const x = (i * 2) / curve.length - 1;
      curve[i] = Math.tanh(3.2 * x);
    }
    shaper.curve = curve;
    shaper.oversample = "4x";

    const filter = audioContext.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 2600;
    filter.Q.value = 0.7;

    guitarGain = audioContext.createGain();
    guitarGain.gain.value = 0.42;
    guitarGain.connect(shaper);
    shaper.connect(filter);
    filter.connect(masterGain);
  }

  return audioContext;
}

function midiToHz(note) {
  return 440 * Math.pow(2, (note - 69) / 12);
}

function trackNode(node) {
  activeNodes.push(node);
  return node;
}

function stopTrackedNodes() {
  if (customAudio) {
    customAudio.pause();
    customAudio.currentTime = 0;
  }

  if (showAudio) {
    showAudio.pause();
    showAudio.currentTime = 0;
  }

  activeNodes.forEach((node) => {
    try {
      node.stop(0);
    } catch {
      try {
        node.disconnect();
      } catch {
        /* already disconnected */
      }
    }
  });
  activeNodes = [];
}

function playTone({ note, time, duration = 0.18, type = "triangle", gain = 0.12, destination = masterGain }) {
  const oscillator = trackNode(audioContext.createOscillator());
  const amp = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(midiToHz(note), time);
  oscillator.frequency.exponentialRampToValueAtTime(midiToHz(note) * 1.01, time + duration);
  amp.gain.setValueAtTime(0.0001, time);
  amp.gain.exponentialRampToValueAtTime(gain, time + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  oscillator.connect(amp);
  amp.connect(destination);
  oscillator.start(time);
  oscillator.stop(time + duration + 0.03);
}

function playPowerChord(time, root, duration = 0.22) {
  [root, root + 7, root + 12].forEach((note, index) => {
    playTone({
      note,
      time: time + index * 0.006,
      duration,
      type: index === 1 ? "square" : "sawtooth",
      gain: index === 1 ? 0.052 : 0.07,
      destination: guitarGain,
    });
  });
}

function playKick(time) {
  const oscillator = trackNode(audioContext.createOscillator());
  const amp = audioContext.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(118, time);
  oscillator.frequency.exponentialRampToValueAtTime(38, time + 0.14);
  amp.gain.setValueAtTime(0.86, time);
  amp.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
  oscillator.connect(amp);
  amp.connect(masterGain);
  oscillator.start(time);
  oscillator.stop(time + 0.2);
}

function makeNoiseBuffer(lengthSeconds = 0.18) {
  const length = audioContext.sampleRate * lengthSeconds;
  const buffer = audioContext.createBuffer(1, length, audioContext.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

function playNoise(time, duration, gainValue, highpass = 900) {
  const noise = trackNode(audioContext.createBufferSource());
  const filter = audioContext.createBiquadFilter();
  const amp = audioContext.createGain();
  noise.buffer = makeNoiseBuffer(duration + 0.04);
  filter.type = "highpass";
  filter.frequency.value = highpass;
  amp.gain.setValueAtTime(0.0001, time);
  amp.gain.exponentialRampToValueAtTime(gainValue, time + 0.01);
  amp.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  noise.connect(filter);
  filter.connect(amp);
  amp.connect(masterGain);
  noise.start(time);
  noise.stop(time + duration + 0.02);
}

function playClap(time) {
  playNoise(time, 0.07, 0.16, 1400);
  playNoise(time + 0.035, 0.06, 0.13, 1400);
  playNoise(time + 0.07, 0.05, 0.1, 1400);
}

function playVocalBlip(time, note) {
  playTone({ note, time, duration: 0.1, type: "sine", gain: 0.095 });
  playTone({ note: note + 12, time: time + 0.018, duration: 0.13, type: "triangle", gain: 0.042 });
}

async function playAudioFile(audio, fallbackDuration = 26000) {
  audio.pause();
  audio.currentTime = 0;
  await audio.play();
  if (Number.isFinite(audio.duration) && audio.duration > 0) {
    return audio.duration * 1000;
  }
  return fallbackDuration;
}

function scheduleBirthdayRock(startTime) {
  const bpm = 156;
  const beat = 60 / bpm;
  const rockMelody = [
    74, 76, 79, 76, 81, 79, 76, 74,
    72, 74, 76, 79, 81, 83, 81, 79,
    76, 79, 81, 84, 83, 81, 79, 76,
    74, 76, 79, 81, 79, 76, 74, 72,
  ];
  const birthdayHint = [
    67, 67, 69, 67, 72, 71, 67, 67,
    69, 67, 74, 72, 67, 67, 79, 76,
    72, 71, 69, 77, 77, 76, 72, 74,
    72, 72, 74, 72, 76, 74, 72, 71,
  ];
  const chords = [50, 55, 53, 57, 50, 55, 57, 53];

  for (let loop = 0; loop < 2; loop += 1) {
    const loopStart = startTime + loop * beat * 32;
    for (let step = 0; step < 32; step += 1) {
      const time = loopStart + step * beat;
      if (step % 2 === 0) playKick(time);
      if (step % 4 === 2) playClap(time);
      if (step % 2 === 1) playNoise(time + beat * 0.03, 0.045, 0.052, 5200);
      if (step % 4 === 0 || step % 4 === 3) {
        playPowerChord(time, chords[Math.floor(step / 4) % chords.length], beat * 0.72);
      }
      if (step % 8 === 7) {
        playNoise(time + beat * 0.45, 0.18, 0.14, 2600);
      }
      playVocalBlip(time + beat * 0.08, rockMelody[step]);
      if (step % 2 === 0) {
        playTone({
          note: birthdayHint[step],
          time: time + beat * 0.42,
          duration: beat * 0.34,
          type: "triangle",
          gain: 0.055,
        });
      }
    }
  }

  const finale = startTime + beat * 64;
  [50, 55, 57, 62].forEach((note, index) => {
    playPowerChord(finale + index * 0.1, note, 0.48);
  });
  [74, 79, 83, 86].forEach((note, index) => {
    playVocalBlip(finale + index * 0.08, note);
  });

  return beat * 66;
}

async function startAudio() {
  stopTrackedNodes();

  if (params.get("audio") === "custom") {
    try {
      if (!customAudio) {
        customAudio = new Audio("assets/birthday-track.mp3");
        customAudio.preload = "auto";
        customAudio.setAttribute("playsinline", "");
        customAudio.volume = 0.9;
      }
      return await playAudioFile(customAudio, 28000);
    } catch {
      /* Fall back to the built-in original rock beat. */
    }
  }

  try {
    if (!showAudio) {
      showAudio = new Audio("assets/birthday-rock.wav");
      showAudio.preload = "auto";
      showAudio.setAttribute("playsinline", "");
      showAudio.volume = 0.95;
    }
    return await playAudioFile(showAudio, 26000);
  } catch {
    /* Fall back to Web Audio synthesis if file playback is blocked. */
  }

  const context = createAudioContext();
  if (!context) return 0;

  if (context.state === "suspended") {
    await context.resume();
  }

  const startTime = context.currentTime + 0.08;
  return scheduleBirthdayRock(startTime) * 1000;
}

function burstConfetti(count = 28) {
  for (let i = 0; i < count; i += 1) {
    const piece = document.createElement("span");
    const size = 7 + Math.random() * 9;
    piece.className = "confetti";
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.width = `${size}px`;
    piece.style.height = `${size * (1.1 + Math.random())}px`;
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.setProperty("--drift", `${(Math.random() - 0.5) * 240}px`);
    piece.style.setProperty("--fall", `${1300 + Math.random() * 1200}ms`);
    piece.style.transform = `rotate(${Math.random() * 180}deg)`;
    confettiLayer.append(piece);
    window.setTimeout(() => piece.remove(), 2600);
  }
}

function pulseBeat(index) {
  document.body.classList.add("beat-flash");
  window.setTimeout(() => document.body.classList.remove("beat-flash"), 90);
  lyricBoard.textContent = lyricLines[index % lyricLines.length];
}

function clearTimers() {
  timers.forEach((timer) => window.clearTimeout(timer));
  timers = [];
}

function stopShow() {
  isPlaying = false;
  clearTimers();
  stopTrackedNodes();
  document.body.classList.remove("playing", "beat-flash");
  playButton.setAttribute("aria-pressed", "false");
  buttonLabel.textContent = "再弹一遍";
  lyricBoard.textContent = "再来一首?";
}

async function startShow() {
  if (isPlaying) {
    stopShow();
    return;
  }

  isPlaying = true;
  document.body.classList.add("playing");
  playButton.setAttribute("aria-pressed", "true");
  buttonLabel.textContent = "正在弹唱";
  lyricBoard.textContent = "开麦!";
  burstConfetti(58);

  const duration = await startAudio();
  const visualDuration = Math.max(duration || 24500, 24500);
  const beatLength = 60000 / 156;

  for (let time = 0, index = 0; time < visualDuration; time += beatLength, index += 1) {
    timers.push(window.setTimeout(() => {
      pulseBeat(index);
      if (index % 4 === 0 || Math.random() > 0.58) burstConfetti(4);
    }, time));
  }

  timers.push(window.setTimeout(stopShow, visualDuration + 500));
}

playButton.addEventListener("click", startShow);

window.addEventListener("pagehide", () => {
  clearTimers();
  stopTrackedNodes();
});

if (params.has("auto")) {
  buttonLabel.textContent = "点一下开麦";
}
