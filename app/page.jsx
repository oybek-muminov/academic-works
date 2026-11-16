'use client'
import { useState, useEffect } from 'react'
import { getCurrentUser, supabase } from './lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import DoiLink from './components/DoiLink'
import { CATEGORIES, dedupeWorks, matchesWork, visibleCategory } from './lib/works'
import { useSignedUrls } from './lib/files'

export default function Home() {
  const router = useRouter()
  const [works, setWorks] = useState([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [user, setUser] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [uploaderProfiles, setUploaderProfiles] = useState({})

  const resolveFileUrl = useSignedUrls([
    ...works.map(w => w.file_url),
    ...Object.values(uploaderProfiles).filter(Boolean).map(p => p.avatar_url),
  ])

  const fetchUploader = async (workId, userId) => {
    if (expandedId === workId) {
      setExpandedId(null)
      return
    }
    setExpandedId(workId)
    if (workId in uploaderProfiles) return

    const { data } = await supabase
      .from('profiles')
      .select('full_name, university, avatar_url')
      .eq('id', userId)
      .maybeSingle()
    setUploaderProfiles(prev => ({ ...prev, [workId]: data || null }))
  }

  useEffect(() => {
    let isActive = true

    const loadPageData = async () => {
      const [currentUser, { data, error }] = await Promise.all([
        getCurrentUser(),
        supabase
          .from('works')
          .select('*')
          .eq('is_public', true)
          .order('created_at', { ascending: false })
      ])

      if (!isActive) return

      if (error) {
        console.error('Works fetch failed:', error)
        setWorks([])
        setError("Ishlarni yuklab bo'lmadi. Qayta urinib ko'ring.")
        setLoading(false)
        return
      }

      setUser(currentUser)
      setWorks(dedupeWorks(data || []))
      setLoading(false)
    }

    loadPageData()

    return () => {
      isActive = false
    }
  }, [])

  const filtered = works.filter(w => matchesWork(w, { search, category }))

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-600 shadow-sm px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center gap-3 mb-3 flex-wrap">
            <h1 className="text-2xl font-bold text-white">
              <Link href="/" className="hover:underline">Ilmiy ishlar bazasi</Link>
            </h1>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Link href="/davriy-jadval" className="border border-white text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700">
                Davriy jadval
              </Link>
              {user ? (
                <Link href="/dashboard" className="bg-white text-blue-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-50">Dashboard</Link>
              ) : (
                <Link href="/login" className="bg-white text-blue-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-50">Kirish</Link>
              )}
            </div>
          </div>
          <input
            type="text"
            aria-label="Maqola nomi yoki muallif ismi bo'yicha qidirish"
            placeholder="Maqola nomi yoki muallif ismi bo'yicha qidirish..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-4 py-2 border border-blue-400 rounded-xl outline-none focus:border-white bg-white bg-opacity-90 text-gray-700"
          />
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6">
        <div className="flex gap-2 mb-6 flex-wrap">
          {CATEGORIES.map((cat, i) => (
            <button key={i} onClick={() => setCategory(i)} aria-pressed={category === i}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${category === i ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 shadow-sm'}`}>
              {cat}
            </button>
          ))}
        </div>

        {error && <div className="bg-red-50 text-red-600 text-sm rounded-xl p-4 mb-4">{error}</div>}

        {loading ? (
          <div className="text-center text-gray-500 py-12">Yuklanmoqda...</div>
        ) : !error && filtered.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            <p>Hech narsa topilmadi</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(work => (
              <div key={work.id} className="bg-white rounded-xl shadow p-5">
                <div className="flex justify-between items-start">
                  <div className="flex-1 pr-4">
                    {visibleCategory(work.category_id) && (
                      <div className="flex items-center gap-2 mb-1">
                        <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">{visibleCategory(work.category_id)}</span>
                      </div>
                    )}
                    <h3 className="font-semibold text-gray-800">{work.title}</h3>
                    {work.authors && <p className="text-xs text-gray-500 mt-1">{work.authors}</p>}
                    {(work.journal || work.doi) && (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {work.journal && <span className="text-xs text-gray-500">{work.journal}</span>}
                        {work.doi && <DoiLink doi={work.doi} />}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 items-end flex-shrink-0">
                    {work.file_url ? (
                      <a href={resolveFileUrl(work.file_url)} target="_blank" rel="noopener noreferrer"
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 whitespace-nowrap">
                        Yuklab olish
                      </a>
                    ) : (
                      <span className="border border-gray-200 px-4 py-2 text-xs text-gray-400 whitespace-nowrap">Fayl yo&apos;q</span>
                    )}
                    <button
                      onClick={() => fetchUploader(work.id, work.user_id)}
                      aria-expanded={expandedId === work.id}
                      className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg text-sm hover:bg-blue-200 whitespace-nowrap">
                      Yuklaganlar
                    </button>
                  </div>
                </div>
                {expandedId === work.id && (
                  <div className="mt-3 border-t pt-3">
                    <div className="bg-blue-50 rounded-xl p-3">
                      {work.id in uploaderProfiles ? (uploaderProfiles[work.id] ? (
                        <div
                          onClick={() => router.push(`/user/${work.user_id}`)}
                          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(`/user/${work.user_id}`) } }}
                          role="link"
                          tabIndex={0}
                          className="bg-white rounded-lg px-4 py-2 text-sm cursor-pointer hover:bg-blue-100 transition flex items-center gap-3"
                        >
                          <div className="w-8 h-8 flex-shrink-0">
                            {uploaderProfiles[work.id]?.avatar_url ? (
                              <Image
                                src={resolveFileUrl(uploaderProfiles[work.id].avatar_url)}
                                alt={`${uploaderProfiles[work.id].full_name || 'Foydalanuvchi'} avatari`}
                                width={32}
                                height={32}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 bg-blue-200 rounded-full flex items-center justify-center text-blue-700 font-bold text-sm">
                                {uploaderProfiles[work.id]?.full_name ? uploaderProfiles[work.id].full_name[0].toUpperCase() : '?'}
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{uploaderProfiles[work.id].full_name || "Noma'lum"}</p>
                            {uploaderProfiles[work.id].university && (
                              <p className="text-xs text-gray-500">{uploaderProfiles[work.id].university}</p>
                            )}
                          </div>
                          <span className="ml-auto text-blue-600 text-xs">Profilni ko&apos;rish</span>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 text-center py-2">Bu ish egasining profili topilmadi</p>
                      )) : (
                        <p className="text-sm text-gray-500 text-center py-2">Yuklanmoqda...</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
