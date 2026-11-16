'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { findSiteMatch, matchesOrcidWork, normalizeOrcid, orcidUrl } from '../lib/orcid'
import DoiLink from './DoiLink'

const FILTERS = [
  { id: 'all', label: 'Hammasi' },
  { id: 'missing', label: "Saytda yo'q" },
  { id: 'onsite', label: 'Saytda bor' },
]

const keyOf = (item) => String(item.putCode || item.doi || item.title || '')

export default function OrcidWorks({ orcid, siteWorks = [], onImport, onOpenWorks }) {
  const normalized = normalizeOrcid(orcid)
  const profileUrl = orcidUrl(orcid)
  const [status, setStatus] = useState('loading')
  const [works, setWorks] = useState([])
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [pending, setPending] = useState('')
  const [message, setMessage] = useState('')
  const [bulk, setBulk] = useState(null)

  useEffect(() => {
    if (!profileUrl) return

    let active = true

    fetch(`/api/orcid/${normalized}`, { headers: { Accept: 'application/json' } })
      .then(async response => {
        const data = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(data.error || "ORCID ma'lumotini yuklab bo'lmadi.")
        return data
      })
      .then(data => {
        if (!active) return
        setWorks(data.works || [])
        setStatus('ready')
      })
      .catch(err => {
        if (!active) return
        setError(err.message)
        setStatus('error')
      })

    return () => {
      active = false
    }
  }, [normalized, profileUrl])

  const items = works.map(work => ({ ...work, match: findSiteMatch(work, siteWorks) }))
  const onsiteCount = items.filter(item => item.match).length
  const missingCount = items.length - onsiteCount
  const missingItems = items.filter(item => !item.match)

  const visible = items.filter(item => {
    if (!matchesOrcidWork(item, { search })) return false
    if (filter === 'onsite') return Boolean(item.match)
    if (filter === 'missing') return !item.match
    return true
  })

  const importOne = async (item, { silent = false } = {}) => {
    if (!onImport || item.match) return false
    if (!silent) {
      setPending(keyOf(item))
      setMessage('')
    }

    try {
      let authors = ''
      if (item.putCode) {
        const response = await fetch(`/api/orcid/${normalized}/work/${item.putCode}`)
        if (response.ok) {
          const detail = await response.json().catch(() => ({}))
          authors = detail.authors || ''
        }
      }

      const result = await onImport({ ...item, authors })
      if (result?.error) throw new Error(result.error)
      if (!silent) setMessage(`"${item.title}" saytga qo'shildi.`)
      return true
    } catch (err) {
      if (!silent) setMessage(err.message || "Qo'shib bo'lmadi.")
      return false
    } finally {
      if (!silent) setPending('')
    }
  }

  const importMissing = async () => {
    if (!onImport || !missingItems.length || bulk) return
    const confirmed = confirm(
      `Saytda yo'q ${missingItems.length} ta nashrni qo'shishni tasdiqlaysizmi?\n\n` +
      "Ular \"Shaxsiy\" holatda qo'shiladi — keyin xohlaganini ochiq qilishingiz mumkin."
    )
    if (!confirmed) return

    setMessage('')
    let done = 0
    let failed = 0
    setBulk({ done, total: missingItems.length, failed })

    for (const item of missingItems) {
      const ok = await importOne(item, { silent: true })
      done += 1
      if (!ok) failed += 1
      setBulk({ done, total: missingItems.length, failed })
    }

    setBulk(null)
    setMessage(
      failed
        ? `${done - failed} ta nashr qo'shildi, ${failed} tasida xatolik yuz berdi.`
        : `${done} ta nashr saytga qo'shildi.`
    )
  }

  const filterCount = (id) => {
    if (id === 'onsite') return onsiteCount
    if (id === 'missing') return missingCount
    return items.length
  }

  const currentStatus = profileUrl ? status : 'invalid'

  return (
    <section className="bg-white rounded-xl shadow p-6 mb-4">
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <div>
          <h3 className="font-semibold text-gray-800">ORCID&apos;dagi nashrlar</h3>
          {normalized && (
            <p className="text-xs text-gray-500 mt-0.5">
              ORCID iD: <span className="font-mono">{normalized}</span>
            </p>
          )}
        </div>
        {profileUrl && (
          <a
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 border border-blue-200 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition"
          >
            orcid.org da ko&apos;rish ↗
          </a>
        )}
      </div>

      {currentStatus === 'invalid' && (
        <p className="text-sm text-red-500">ORCID iD noto&apos;g&apos;ri formatda.</p>
      )}

      {currentStatus === 'loading' && <p className="text-sm text-gray-500">Yuklanmoqda...</p>}

      {currentStatus === 'error' && <p className="text-sm text-red-500">{error}</p>}

      {currentStatus === 'ready' && works.length === 0 && (
        <p className="text-sm text-gray-500">ORCID profilida nashrlar topilmadi.</p>
      )}

      {currentStatus === 'ready' && works.length > 0 && (
        <>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {FILTERS.map(option => (
              <button
                key={option.id}
                type="button"
                onClick={() => setFilter(option.id)}
                aria-pressed={filter === option.id}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  filter === option.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {option.label} ({filterCount(option.id)})
              </button>
            ))}
          </div>

          <input
            type="text"
            aria-label="ORCID nashrlari ichida qidirish"
            placeholder="Sarlavha, jurnal, DOI yoki yil bo'yicha qidirish..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:border-blue-500 bg-gray-50 mb-3"
          />

          {onImport && missingCount > 0 && (
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={importMissing}
                disabled={Boolean(bulk) || Boolean(pending)}
                className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 transition hover:bg-green-100 disabled:opacity-50"
              >
                {bulk
                  ? `Qo'shilmoqda... ${bulk.done}/${bulk.total}`
                  : `Saytda yo'q ${missingCount} tasini saytga qo'shish`}
              </button>
              <span className="text-xs text-gray-500">Shaxsiy holatda qo&apos;shiladi</span>
            </div>
          )}

          {message && (
            <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-800">
              <span>{message}</span>
              {onOpenWorks && (
                <button type="button" onClick={onOpenWorks} className="underline hover:no-underline">
                  Saytdagi ishlarda ko&apos;rish →
                </button>
              )}
            </div>
          )}

          {visible.length === 0 ? (
            <p className="text-sm text-gray-500">Hech narsa topilmadi.</p>
          ) : (
            <ul className="max-h-[34rem] space-y-3 overflow-y-auto pr-1">
              {visible.map((item, index) => (
                <li
                  key={`${keyOf(item)}-${index}`}
                  className="border-t border-gray-100 pt-3 first:border-t-0 first:pt-0"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800">{item.title}</p>
                      {(item.journal || item.year) && (
                        <p className="mt-0.5 text-xs text-gray-500">
                          {[item.journal, item.year].filter(Boolean).join(' · ')}
                        </p>
                      )}
                      {item.doi && <div className="mt-2"><DoiLink doi={item.doi} /></div>}
                    </div>
                    {item.match ? (
                      <Link
                        href={`/works/${item.match.id}`}
                        className="flex-shrink-0 rounded-full border border-green-200 bg-green-50 px-2 py-1 text-xs text-green-700 transition hover:bg-green-100"
                      >
                        ✓ saytda bor
                      </Link>
                    ) : onImport ? (
                      <button
                        type="button"
                        onClick={() => importOne(item)}
                        disabled={Boolean(pending) || Boolean(bulk)}
                        className="flex-shrink-0 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
                      >
                        {pending === keyOf(item) ? "Qo'shilmoqda..." : "Saytga qo'shish"}
                      </button>
                    ) : (
                      <span className="flex-shrink-0 rounded-full border border-gray-200 px-2 py-1 text-xs text-gray-400">
                        saytda yo&apos;q
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  )
}
