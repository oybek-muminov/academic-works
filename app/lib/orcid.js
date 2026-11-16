import { normalizeDoi } from './works.js'

// ORCID iD ni "0000-0000-0000-0000" ko'rinishiga keltiradi.
// To'liq havola (https://orcid.org/...), bo'sh joysiz yoki X bilan yozilgan
// variantlarni ham qabul qiladi.
export const normalizeOrcid = (value) => {
  if (!value) return ''
  const digits = String(value)
    .toUpperCase()
    .replace(/[^0-9X]/g, '')
  if (digits.length !== 16) return ''
  return digits.replace(/(.{4})(?=.)/g, '$1-')
}

// ISO 7064 11-2 tekshiruv raqami.
const orcidCheckDigit = (digits15) => {
  let total = 0
  for (const char of digits15) total = (total + Number(char)) * 2
  const remainder = total % 11
  const result = (12 - remainder) % 11
  return result === 10 ? 'X' : String(result)
}

export const isValidOrcid = (value) => {
  const orcid = normalizeOrcid(value)
  if (!orcid) return false
  const digits = orcid.replace(/-/g, '')
  return orcidCheckDigit(digits.slice(0, 15)) === digits[15]
}

export const orcidUrl = (value) => {
  const orcid = normalizeOrcid(value)
  return isValidOrcid(orcid) ? `https://orcid.org/${orcid}` : null
}

// Sarlavhalarni solishtirish uchun: registr, tinish belgilari va ortiqcha
// bo'shliqlar hisobga olinmaydi.
export const normalizeTitle = (value) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\u0400-\u04ff]+/g, ' ')
    .trim()

const looksSameTitle = (a, b) => {
  const left = normalizeTitle(a)
  const right = normalizeTitle(b)
  if (left.length < 20 || right.length < 20) return false
  return left === right
}

// ORCID yozuvi saytdagi ish bilan bir xilmi: avval DOI, keyin sarlavha.
export const matchesSiteWork = (orcidWork, siteWork) => {
  const doi = normalizeDoi(orcidWork?.doi)
  if (doi && normalizeDoi(siteWork?.doi) === doi) return true
  return looksSameTitle(orcidWork?.title, siteWork?.title)
}

export const findSiteMatch = (orcidWork, siteWorks = []) =>
  siteWorks.find(siteWork => matchesSiteWork(orcidWork, siteWork)) || null
