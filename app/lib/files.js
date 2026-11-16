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
