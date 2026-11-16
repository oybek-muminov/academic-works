const MARKER = '/object/public/works-files/'

export const storagePath = (url) => {
  if (!url) return null
  const index = url.indexOf(MARKER)
  if (index === -1) return null
  return decodeURIComponent(url.slice(index + MARKER.length).split('?')[0])
}
