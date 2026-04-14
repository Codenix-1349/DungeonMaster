import React, { useEffect, useRef, useState } from 'react'

const FRAME_COUNT = 12
const FRAME_SIZE = 512
const FRAME_INTERVAL = 75  // ~13 FPS

/**
 * Animated D20 dice roll using sprite sheets (public/d20/r01.png–r20.png).
 * Plays the result sprite sheet once through all 12 frames, then holds.
 *
 * Props:
 *   result     — final d20 value (1-20)
 *   size       — display size in px (default 220)
 *   holdTime   — how long the result stays visible in ms (default 2000)
 *   onComplete — fires after holdTime expires
 */
export default function D20Animation({ result, runId = 0, size = 220, holdTime = 2000, onComplete }) {
  const [frame, setFrame] = useState(0)
  const [done, setDone] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  const resultNum = String(Math.min(20, Math.max(1, result || 1))).padStart(2, '0')
  const scale = size / FRAME_SIZE
  const sheetWidth = FRAME_COUNT * FRAME_SIZE * scale

  // Wait for sprite sheet to load, then play through all 12 frames once
  useEffect(() => {
    setFrame(0)
    setDone(false)
    setLoaded(false)

    let intervalId = null
    let cancelled = false

    const startAnimation = () => {
      if (cancelled) return
      setLoaded(true)
      let tick = 0
      intervalId = setInterval(() => {
        tick++
        setFrame(tick)
        if (tick >= FRAME_COUNT - 1) {
          clearInterval(intervalId)
          setDone(true)
        }
      }, FRAME_INTERVAL)
    }

    const img = new Image()
    img.src = `/d20/r${resultNum}.png`
    if (img.complete) {
      startAnimation()
    } else {
      img.onload = startAnimation
    }

    return () => {
      cancelled = true
      if (intervalId) clearInterval(intervalId)
    }
  }, [resultNum, runId])

  // After hold time, fire onComplete
  useEffect(() => {
    if (!done) return
    const timeout = setTimeout(() => {
      onCompleteRef.current?.()
    }, holdTime)
    return () => clearTimeout(timeout)
  }, [done, holdTime])

  // Placeholder while sprite sheet loads
  if (!loaded) {
    return (
      <div
        style={{ width: size, height: size }}
        className="flex items-center justify-center animate-pulse"
      >
        <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 100 100" className="text-gold-500/40">
          <polygon
            points="50,5 61,35 95,35 68,57 79,90 50,70 21,90 32,57 5,35 39,35"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          <text x="50" y="58" textAnchor="middle" fill="currentColor" fontSize="24" fontFamily="serif">20</text>
        </svg>
      </div>
    )
  }

  const posX = -(frame % FRAME_COUNT) * FRAME_SIZE * scale

  return (
    <div
      style={{
        width: size,
        height: size,
        backgroundImage: `url(/d20/r${resultNum}.png)`,
        backgroundSize: `${sheetWidth}px ${size}px`,
        backgroundPosition: `${posX}px 0`,
        backgroundRepeat: 'no-repeat',
      }}
    />
  )
}
