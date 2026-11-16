'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { findSiteMatch, normalizeOrcid, orcidUrl } from '../lib/orcid'
import DoiLink from './DoiLink'

function OrcidWorkList({ orcid, siteWorks }) {
  const [status, setStatus] = useState('loading')
  const [works, setWorks] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    fetch(`/api/orcid/${orcid}`, { headers: { Accept: 'application/json' } })
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
  }, [orcid])

  if (status === 'loading') {
    return <p className="text-sm text-gray-500">Yuklanmoqda...</p>
  }

  if (status === 'error') {
    return <p className="text-sm text-red-500">{error || "ORCID ma'lumotini yuklab bo'lmadi."}</p>
  }

  if (works.length === 0) {
    return <p className="text-sm text-gray-500">ORCID profilida nashrlar topilmadi.</p>
  }

  return (
    <ul className="space-y-3">
      {works.map((item, index) => {
        const match = findSiteMatch(item, siteWorks)
        const meta = [item.journal, item.year].filter(Boolean).join(' · ')

        return (
          <li key={`${item.putCode || item.doi || item.title}-${index}`} className="border-t border-gray-100 pt-3 first:border-t-0 first:pt-0">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">{item.title}</p>
                {meta && <p className="text-xs text-gray-500 mt-0.5">{meta}</p>}
              </div>
              {match ? (
                <Link
                  href={`/works/${match.id}`}
                  className="flex-shrink-0 text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded-full hover:bg-green-100 transition"
                >
                  ✓ saytda bor
                </Link>
              ) : (
                <span className="flex-shrink-0 text-xs text-gray-400 border border-gray-200 px-2 py-1 rounded-full">
                  saytda yo&apos;q
                </span>
              )}
            </div>
            {item.doi && <div className="mt-2"><DoiLink doi={item.doi} /></div>}
          </li>
        )
      })}
    </ul>
  )
}

export default function OrcidWorks({ orcid, siteWorks = [] }) {
  const normalized = normalizeOrcid(orcid)
  const profileUrl = orcidUrl(orcid)

  return (
    <section className="bg-white rounded-xl shadow p-6 mb-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
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

      {profileUrl ? (
        <OrcidWorkList key={normalized} orcid={normalized} siteWorks={siteWorks} />
      ) : (
        <p className="text-sm text-red-500">ORCID iD noto&apos;g&apos;ri formatda.</p>
      )}
    </section>
  )
}
