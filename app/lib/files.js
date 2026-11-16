import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { storagePath } from './filePath'

// Bucket private bo'lsa ham, public bo'lsa ham ishlaydi: imzolangan URL bo'lsa shuni,
// aks holda asl URLni qaytaradi.
export function useSignedUrls(urls) {
  const [signed, setSigned] = useState({})
  const key = [...new Set(urls.filter(Boolean))].join('\n')

  useEffect(() => {
    const entries = key
      .split('\n')
      .map(url => [url, storagePath(url)])
      .filter(([, path]) => path)
    if (!entries.length) return

    let active = true
    supabase.storage
      .from('works-files')
      .createSignedUrls(entries.map(([, path]) => path), 3600)
      .then(({ data }) => {
        if (!active || !data) return
        const byPath = Object.fromEntries(data.filter(item => item.signedUrl).map(item => [item.path, item.signedUrl]))
        setSigned(Object.fromEntries(entries.filter(([, path]) => byPath[path]).map(([url, path]) => [url, byPath[path]])))
      })

    return () => {
      active = false
    }
  }, [key])

  return (url) => (url ? signed[url] || url : null)
}

// Faylni faqat foydalanuvchi bosganda imzolaydi — sahifa yuklanishida
// barcha fayllar uchun ortiqcha storage so'rovi yuborilmaydi.
const signedCache = new Map()
const SIGNED_TTL_MS = 30 * 60 * 1000

export const openWorkFile = async (fileUrl, fileName) => {
  const path = storagePath(fileUrl)
  if (!path) throw new Error('Fayl topilmadi.')

  const cached = signedCache.get(path)
  if (cached && cached.expiresAt > Date.now()) {
    window.open(cached.url, '_blank', 'noopener,noreferrer')
    return
  }

  // Imzolash asinxron bo'lgani uchun oynani darhol ochamiz (popup bloklanmasin).
  const win = typeof window !== 'undefined' ? window.open('', '_blank') : null
  if (win) win.opener = null

  try {
    const { data, error } = await supabase.storage
      .from('works-files')
      .createSignedUrl(path, 3600, fileName ? { download: fileName } : undefined)

    if (error || !data?.signedUrl) throw new Error("Faylni ochib bo'lmadi.")

    signedCache.set(path, { url: data.signedUrl, expiresAt: Date.now() + SIGNED_TTL_MS })

    if (win) win.location.replace(data.signedUrl)
    else window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  } catch (err) {
    if (win) win.close()
    throw err
  }
}
