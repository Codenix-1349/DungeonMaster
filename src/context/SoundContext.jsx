import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

// Music tracks (looping)
import landingMp3 from '../assets/sounds/LandingPage.mp3'
import battle1Mp3 from '../assets/sounds/Battle1.mp3'
import battle2Mp3 from '../assets/sounds/Battle2.mp3'
import tavernWav from '../assets/sounds/Tavern.wav'
import forestWav from '../assets/sounds/Forest.wav'
import dungeonWav from '../assets/sounds/dungeon-ambiance.wav'

// SFX (one-shot)
import lockWav from '../assets/sounds/Dungeon_Lock.wav'
import lock2Wav from '../assets/sounds/dungeon_lock_2.wav'
import smithWav from '../assets/sounds/smith.wav'

const MUSIC_TRACKS = {
  landing: landingMp3,
  battle1: battle1Mp3,
  battle2: battle2Mp3,
  tavern: tavernWav,
  forest: forestWav,
  dungeon: dungeonWav,
}

const SFX_TRACKS = {
  lock: [lockWav, lock2Wav],
  smith: [smithWav],
}

const FADE_MS = 800
const FADE_STEP_MS = 50

const SoundContext = createContext(null)

function loadVolume(key, fallback) {
  try {
    const v = localStorage.getItem(key)
    return v !== null ? parseFloat(v) : fallback
  } catch { return fallback }
}

export function SoundProvider({ children }) {
  const [musicVolume, setMusicVolumeState] = useState(() => loadVolume('dm_musicVolume', 0.4))
  const [sfxVolume, setSfxVolumeState] = useState(() => loadVolume('dm_sfxVolume', 0.6))
  const [currentTrack, setCurrentTrack] = useState(null)

  const musicRef = useRef(null)
  const fadeRef = useRef(null)
  const unlockedRef = useRef(false)

  // Initialize music audio element once
  useEffect(() => {
    const audio = new Audio()
    audio.loop = true
    audio.volume = 0
    musicRef.current = audio
    return () => {
      audio.pause()
      audio.src = ''
    }
  }, [])

  // Unlock audio on first user interaction (browser autoplay policy)
  useEffect(() => {
    const unlock = () => {
      if (unlockedRef.current) return
      unlockedRef.current = true
      const audio = musicRef.current
      // If a track was queued before unlock, start playback now
      if (audio && audio.src && audio.paused) {
        audio.play().catch(() => {})
      }
      document.removeEventListener('click', unlock)
      document.removeEventListener('keydown', unlock)
      document.removeEventListener('touchstart', unlock)
    }
    document.addEventListener('click', unlock)
    document.addEventListener('keydown', unlock)
    document.addEventListener('touchstart', unlock)
    return () => {
      document.removeEventListener('click', unlock)
      document.removeEventListener('keydown', unlock)
      document.removeEventListener('touchstart', unlock)
    }
  }, [])

  // Persist volumes
  const setMusicVolume = useCallback((v) => {
    const clamped = Math.max(0, Math.min(1, v))
    setMusicVolumeState(clamped)
    localStorage.setItem('dm_musicVolume', String(clamped))
    if (musicRef.current && !fadeRef.current) {
      musicRef.current.volume = clamped
    }
  }, [])

  const setSfxVolume = useCallback((v) => {
    const clamped = Math.max(0, Math.min(1, v))
    setSfxVolumeState(clamped)
    localStorage.setItem('dm_sfxVolume', String(clamped))
  }, [])

  // Fade helper
  const fadeTo = useCallback((targetVol, onDone) => {
    if (fadeRef.current) clearInterval(fadeRef.current)
    const audio = musicRef.current
    if (!audio) { onDone?.(); return }
    const startVol = audio.volume
    const diff = targetVol - startVol
    const steps = Math.max(1, Math.round(FADE_MS / FADE_STEP_MS))
    let step = 0
    fadeRef.current = setInterval(() => {
      step++
      audio.volume = Math.max(0, Math.min(1, startVol + (diff * step / steps)))
      if (step >= steps) {
        clearInterval(fadeRef.current)
        fadeRef.current = null
        audio.volume = Math.max(0, Math.min(1, targetVol))
        onDone?.()
      }
    }, FADE_STEP_MS)
  }, [])

  const playMusic = useCallback((trackName) => {
    if (!trackName) { stopMusic(); return }
    // For 'battle', randomly pick battle1 or battle2
    let resolvedName = trackName
    if (trackName === 'battle') {
      resolvedName = Math.random() < 0.5 ? 'battle1' : 'battle2'
    }
    const src = MUSIC_TRACKS[resolvedName]
    if (!src) return

    if (currentTrack === resolvedName) return
    setCurrentTrack(resolvedName)

    const audio = musicRef.current
    if (!audio) return

    // If already playing, crossfade
    if (!audio.paused && audio.src) {
      fadeTo(0, () => {
        audio.src = src
        audio.volume = 0
        audio.play().catch(() => {})
        fadeTo(musicVolume)
      })
    } else {
      audio.src = src
      audio.volume = 0
      audio.play().catch(() => {})
      fadeTo(musicVolume)
    }
  }, [currentTrack, musicVolume, fadeTo])

  const stopMusic = useCallback(() => {
    setCurrentTrack(null)
    const audio = musicRef.current
    if (!audio || audio.paused) return
    fadeTo(0, () => {
      audio.pause()
      audio.src = ''
    })
  }, [fadeTo])

  const playSfx = useCallback((name) => {
    const variants = SFX_TRACKS[name]
    if (!variants || !variants.length) return
    const src = variants[Math.floor(Math.random() * variants.length)]
    const audio = new Audio(src)
    audio.volume = sfxVolume
    audio.play().catch(() => {})
  }, [sfxVolume])

  // Sync music volume when slider changes (while playing)
  useEffect(() => {
    const audio = musicRef.current
    if (audio && !audio.paused && !fadeRef.current) {
      audio.volume = musicVolume
    }
  }, [musicVolume])

  // Pause/resume on page visibility
  useEffect(() => {
    const handler = () => {
      const audio = musicRef.current
      if (!audio) return
      if (document.hidden) {
        audio.pause()
      } else if (currentTrack) {
        audio.play().catch(() => {})
      }
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [currentTrack])

  const value = {
    musicVolume,
    sfxVolume,
    setMusicVolume,
    setSfxVolume,
    playMusic,
    stopMusic,
    playSfx,
    currentTrack,
  }

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>
}

export function useSound() {
  const ctx = useContext(SoundContext)
  if (!ctx) throw new Error('useSound must be used inside SoundProvider')
  return ctx
}
