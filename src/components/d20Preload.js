let preloaded = false

export function preloadAllD20Sheets() {
  if (preloaded) return
  preloaded = true
  for (let i = 1; i <= 20; i++) {
    const img = new Image()
    img.src = `/d20/r${String(i).padStart(2, '0')}.png`
  }
}
