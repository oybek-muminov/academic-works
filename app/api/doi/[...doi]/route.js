import { doiApiPath, isValidDoi, normalizeDoi } from '../../../lib/works'

const CROSSREF_TIMEOUT_MS = 10000
const CACHE_SECONDS = 60 * 60 * 24

const authorName = (author) => {
  if (!author) return ''
  if (author.name) return author.name
  return [author.given, author.family].filter(Boolean).join(' ').trim()
}

export async function GET(request, { params }) {
  const { doi: segments } = await params
  const raw = Array.isArray(segments) ? segments.join('/') : String(segments || '')

  let decoded = raw
  try {
    decoded = decodeURIComponent(raw)
  } catch {
    // Noto'g'ri kodlangan bo'lsa, asl qiymat bilan davom etamiz.
  }

  const doi = normalizeDoi(decoded)
  if (!isValidDoi(doi)) {
    return Response.json({ error: "DOI noto'g'ri formatda. Masalan: 10.1038/nature12373" }, { status: 400 })
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), CROSSREF_TIMEOUT_MS)

  try {
    const response = await fetch(`https://api.crossref.org/works/${doiApiPath(doi)}`, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'academic-works/1.0 (https://github.com/; mailto:noreply@example.com)',
      },
      cache: 'no-store',
    })

    if (response.status === 404) {
      return Response.json({ error: 'Bu DOI Crossref bazasidan topilmadi.' }, { status: 404 })
    }
    if (!response.ok) {
      return Response.json({ error: 'Crossref javob bermadi. Keyinroq urinib ko\'ring.' }, { status: 502 })
    }

    const payload = await response.json()
    const item = payload?.message
    if (!item) {
      return Response.json({ error: 'Crossref bo\'sh javob qaytardi.' }, { status: 502 })
    }

    const authors = (item.author || []).map(authorName).filter(Boolean)

    const body = {
      doi,
      title: (item.title || [])[0] || '',
      authors: authors.join(', '),
      journal: (item['container-title'] || [])[0] || item.publisher || '',
      year: item.issued?.['date-parts']?.[0]?.[0] || null,
      type: item.type || '',
      url: item.URL || `https://doi.org/${doi}`,
    }

    return Response.json(body, {
      headers: { 'Cache-Control': `public, max-age=${CACHE_SECONDS}, s-maxage=${CACHE_SECONDS}` },
    })
  } catch (error) {
    const aborted = error?.name === 'AbortError'
    return Response.json(
      { error: aborted ? 'Crossref juda sekin javob berdi. Qayta urinib ko\'ring.' : 'Crossref bilan bog\'lanishda xatolik.' },
      { status: 504 }
    )
  } finally {
    clearTimeout(timer)
  }
}
