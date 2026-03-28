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
export default function D20Animation({ result, size = 220, holdTime = 2000, onComplete }) {
  const [frame, setFrame] = useState(0)
  const [done, setDone] = useState(false)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  const resultNum = String(Math.min(20, Math.max(1, result || 1))).padStart(2, '0')
  const scale = size / FRAME_SIZE
  const sheetWidth = FRAME_COUNT * FRAME_SIZE * scale

  // Play through all 12 frames once, then hold
  useEffect(() => {
    let tick = 0
    const interval = setInterval(() => {
      tick++
      setFrame(tick)
      if (tick >= FRAME_COUNT - 1) {
        clearInterval(interval)
        setDone(true)
      }
    }, FRAME_INTERVAL)

    return () => clearInterval(interval)
  }, [])

  // After hold time, fire onComplete
  useEffect(() => {
    if (!done) return
    const timeout = setTimeout(() => {
      onCompleteRef.current?.()
    }, holdTime)
    return () => clearTimeout(timeout)
  }, [done, holdTime])

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
