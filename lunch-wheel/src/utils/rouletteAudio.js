let audioContext
let lastTickAt = 0

function getAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext
  if (!AudioContextClass) return null
  if (!audioContext) audioContext = new AudioContextClass()
  return audioContext
}

export function primeRouletteAudio() {
  const context = getAudioContext()
  if (context?.state === 'suspended') context.resume().catch(() => {})
}

function playTone({ frequency, duration, volume, type = 'sine', delay = 0 }) {
  const context = getAudioContext()
  if (!context || context.state !== 'running') return
  const start = context.currentTime + delay
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, start)
  gain.gain.setValueAtTime(volume, start)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  oscillator.connect(gain)
  gain.connect(context.destination)
  oscillator.start(start)
  oscillator.stop(start + duration)
}

export function playBoundaryTick(angularSpeed) {
  const now = performance.now()
  if (now - lastTickAt < 34) return
  lastTickAt = now
  const intensity = Math.max(0, Math.min(1, angularSpeed / 18))
  playTone({
    frequency: 650 + intensity * 420,
    duration: 0.025 + intensity * 0.018,
    volume: 0.018 + intensity * 0.025,
    type: 'triangle',
  })
}

export function playWinnerSound() {
  ;[
    [523.25, 0],
    [659.25, 0.09],
    [783.99, 0.18],
    [1046.5, 0.3],
  ].forEach(([frequency, delay]) =>
    playTone({
      frequency,
      delay,
      duration: 0.22,
      volume: 0.045,
      type: 'sine',
    }),
  )
}
