export const CATEGORIES = ['Barchasi', 'Maqola', 'Tezis', 'Kitob', 'Sertifikat', 'Loyiha', 'Boshqa']
export const CATEGORY_OPTIONS = CATEGORIES.slice(1)

export const visibleCategory = (id) => (id >= 1 && id < CATEGORIES.length ? CATEGORIES[id] : '')

export const matchesWork = (work, { search = '', category = 0 } = {}) => {
  const term = search.trim().toLowerCase()
  const inText = !term ||
    (work.title || '').toLowerCase().includes(term) ||
    (work.authors || '').toLowerCase().includes(term)
  return inText && (category === 0 || work.category_id === category)
}

// DOI har xil ko'rinishda kiritilishi mumkin: to'liq havola, "doi:" prefiksi,
// katta harflar yoki bo'sh joylar bilan. Hammasini bitta ko'rinishga keltiramiz.
const DOI_PREFIX = /^(?:https?:\/\/(?:dx\.)?doi\.org\/|doi:\s*)/i

export const normalizeDoi = (value) => {
  if (!value) return ''
  return String(value)
    .trim()
    .replace(DOI_PREFIX, '')
    .replace(/^\/+/, '')
    .replace(/\s+/g, '')
    .toLowerCase()
}

export const isValidDoi = (value) => /^10\.\d{4,9}\/\S+$/.test(normalizeDoi(value))

// doi.org `#` va `?` belgilarini yo'l qismida qabul qilmaydi.
export const doiUrl = (value) => {
  const doi = normalizeDoi(value)
  if (!isValidDoi(doi)) return null
  return `https://doi.org/${doi.replace(/#/g, '%23').replace(/\?/g, '%3F')}`
}

// Crossref API uchun xavfsiz yo'l: `/` saqlanadi, qolgan belgilar kodlanadi.
export const doiApiPath = (value) => {
  const doi = normalizeDoi(value)
  if (!isValidDoi(doi)) return null
  return doi.split('/').map(encodeURIComponent).join('/')
}

// Faqat bir xil foydalanuvchi yuklagan haqiqiy dublikatlarni yashiradi.
export const dedupeWorks = (works) => {
  const seen = new Set()
  return works.filter(work => {
    const key = [
      work.user_id,
      (work.title || '').toLowerCase().trim(),
      (work.authors || '').toLowerCase().trim(),
    ].join('|')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
