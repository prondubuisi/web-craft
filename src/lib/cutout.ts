export function colorDist(a: [number, number, number], b: [number, number, number]): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
}

export function cutoutPixels(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  threshold = 48,
): Uint8ClampedArray {
  const at = (x: number, y: number): [number, number, number] => {
    const i = (y * width + x) * 4
    return [data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0]
  }
  const corners: [number, number, number][] = [
    at(0, 0),
    at(width - 1, 0),
    at(0, height - 1),
    at(width - 1, height - 1),
  ]
  const bg: [number, number, number] = [
    corners.reduce((s, c) => s + c[0], 0) / 4,
    corners.reduce((s, c) => s + c[1], 0) / 4,
    corners.reduce((s, c) => s + c[2], 0) / 4,
  ]
  const next = new Uint8ClampedArray(data)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      const pixel: [number, number, number] = [next[i] ?? 0, next[i + 1] ?? 0, next[i + 2] ?? 0]
      const d = colorDist(pixel, bg)
      if (d < threshold) {
        next[i + 3] = 0
      } else if (d < threshold + 18) {
        next[i + 3] = Math.round(((d - threshold) / 18) * (next[i + 3] ?? 255))
      }
    }
  }
  return next
}

export function cutoutImage(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const w = Math.min(img.naturalWidth || img.width, 1600)
      const h = Math.round(((img.naturalHeight || img.height) / (img.naturalWidth || img.width || 1)) * w)
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('No canvas'))
        return
      }
      ctx.drawImage(img, 0, 0, w, h)
      const shot = ctx.getImageData(0, 0, w, h)
      const next = cutoutPixels(shot.data, w, h)
      shot.data.set(next)
      ctx.putImageData(shot, 0, 0)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => reject(new Error('Could not cut that photo'))
    img.src = src
  })
}
