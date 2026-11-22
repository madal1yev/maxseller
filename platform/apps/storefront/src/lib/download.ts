/** Blob'ni fayl sifatida brauzerga yuklab berish. */
export function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Content-Disposition yoki default nomdan foydalanib xavfsiz fayl nomi olish. */
export function fileNameFrom(input: string | null | undefined, fallback = 'file'): string {
  if (!input) return fallback
  const match = input.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i)
  const name = (match?.[1] ?? input).split(/[\\/]/).pop() ?? fallback
  return decodeURIComponent(name) || fallback
}
