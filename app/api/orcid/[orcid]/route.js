import { isValidOrcid, normalizeOrcid } from '../../../lib/orcid'

const ORCID_TIMEOUT_MS = 12000
const CACHE_SECONDS = 60 * 60 * 6

const pickDoi = (summary) => {
  const ids = summary?.['external-ids']?.['external-id'] || []
  const doi = ids.find(id => String(id['external-id-type']).toLowerCase() === 'doi')
  return doi?.['external-id-value'] || ''
}

const toWork = (group) => {
  const summary = (group?.['work-summary'] || [])[0]
  if (!summary) return null

  return {
    title: summary.title?.title?.value || '',
    year: summary['publication-date']?.year?.value || null,
    journal: summary['journal-title']?.value || '',
    type: summary.type || '',
    doi: pickDoi(summary),
    url: summary.url?.value || '',
    putCode: summary['put-code'] || null,
  }
}

export async function GET(request, { params }) {
  const { orcid: raw } = await params

  let decoded = String(raw || '')
  try {
    decoded = decodeURIComponent(decoded)
  } catch {
    // Asl qiymat bilan davom etamiz.
  }

  const orcid = normalizeOrcid(decoded)
  if (!isValidOrcid(orcid)) {
    return Response.json({ error: "ORCID iD noto'g'ri. Masalan: 0000-0002-1825-0097" }, { status: 400 })
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ORCID_TIMEOUT_MS)

  try {
    const response = await fetch(`https://pub.orcid.org/v3.0/${orcid}/works`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })

    if (response.status === 404) {
      return Response.json({ error: 'Bu ORCID iD topilmadi.' }, { status: 404 })
    }
    if (!response.ok) {
      return Response.json({ error: "ORCID javob bermadi. Keyinroq urinib ko'ring." }, { status: 502 })
    }

    const payload = await response.json()
    const works = (payload?.group || [])
      .map(toWork)
      .filter(work => work && work.title)
      .sort((a, b) => (Number(b.year) || 0) - (Number(a.year) || 0))

    return Response.json(
      { orcid, url: `https://orcid.org/${orcid}`, works },
      { headers: { 'Cache-Control': `public, max-age=${CACHE_SECONDS}, s-maxage=${CACHE_SECONDS}` } }
    )
  } catch (error) {
    const aborted = error?.name === 'AbortError'
    return Response.json(
      { error: aborted ? 'ORCID juda sekin javob berdi. Qayta urinib ko\'ring.' : "ORCID bilan bog'lanishda xatolik." },
      { status: 504 }
    )
  } finally {
    clearTimeout(timer)
  }
}
