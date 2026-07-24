import { useMemo } from 'react'

const COLORS = ['#ef476f', '#ffd166', '#3b82f6', '#65a84a', '#9b5de5']

export default function CelebrationBurst({ active, burstKey }) {
  const particles = useMemo(
    () =>
      Array.from({ length: 36 }, (_, index) => ({
        id: `${burstKey}-${index}`,
        color: COLORS[index % COLORS.length],
        x: ((index * 37) % 100) - 50,
        drift: ((index * 53) % 90) - 45,
        delay: (index % 9) * 0.035,
        duration: 0.9 + (index % 6) * 0.12,
        rotate: (index * 67) % 360,
      })),
    [burstKey],
  )

  if (
    !active ||
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  ) {
    return null
  }

  return (
    <div className="celebration-burst" aria-hidden>
      {particles.map((particle) => (
        <i
          key={particle.id}
          style={{
            '--confetti-color': particle.color,
            '--confetti-x': `${particle.x}vw`,
            '--confetti-drift': `${particle.drift}px`,
            '--confetti-delay': `${particle.delay}s`,
            '--confetti-duration': `${particle.duration}s`,
            '--confetti-rotate': `${particle.rotate}deg`,
          }}
        />
      ))}
    </div>
  )
}
