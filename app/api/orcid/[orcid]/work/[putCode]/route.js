import { authorsFromWorkDetail, isValidOrcid, normalizeOrcid } from '../../../../../lib/orcid'

const ORCID_TIMEOUT_MS = 12000

// Bitta ishning to'liq yozuvi: import paytida mualliflarni olish uchun.
export async function GET(request, { params }) {
  const { orcid: raw, putCode } = await params

  let decoded = String(raw || '')
  try {
    decoded = decodeURIComponent(decoded)
  } catch {
    // Asl qiymat bilan davom etamiz.
  }

  const orcid = normalizeOrcid(decoded)
  if (!isValidOrcid(orcid)) {
    return Response.json({ error: "ORCID iD noto'g'ri." }, { status: 400 })
  }

  const code = String(putCode || '')
  if (!/^\d+$/.test(code)) {
    return Response.json({ error: "Ish kodi noto'g'ri." }, { status: 400 })
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ORCID_TIMEOUT_MS)

  try {
    const response = await fetch(`https://pub.orcid.org/v3.0/${orcid}/work/${code}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })

    if (response.status === 404) {
      return Response.json({ error: "ORCID'da bu ish topilmadi." }, { status: 404 })
    }
    if (!response.ok) {
      return Response.json({ error: "ORCID javob bermadi. Keyinroq urinib ko'ring." }, { status: 502 })
    }

    const payload = await response.json()
    return Response.json(
      { authors: authorsFromWorkDetail(payload) },
      { headers: { 'Cache-Control': 'public, max-age=21600, s-maxage=21600' } }
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
