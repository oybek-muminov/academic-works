'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { CATEGORIES, matchesWork, visibleCategory } from '../../lib/works'
import { useSignedUrls } from '../../lib/files'
import { orcidUrl } from '../../lib/orcid'
import OrcidWorks from '../../components/OrcidWorks'
import DoiLink from '../../components/DoiLink'

export default function UserProfile() {
  const { id } = useParams()
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [works, setWorks] = useState([])
  const [category, setCategory] = useState(0)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const resolveFileUrl = useSignedUrls([profile?.avatar_url, ...works.map(w => w.file_url)])

  useEffect(() => {
    const fetchData = async () => {
      const { data: profile, error: profileError } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle()
      if (profileError) {
        console.error('Profile fetch failed:', profileError)
        setError("Profilni yuklab bo'lmadi.")
        setLoading(false)
        return
      }
      setProfile(profile)
      const { data: works, error: worksError } = await supabase.from('works').select('*').eq('user_id', id).eq('is_public', true).order('created_at', { ascending: false })
      if (worksError) console.error('Works fetch failed:', worksError)
      setWorks(works || [])
      setLoading(false)
    }
    fetchData()
  }, [id])

  const filtered = works.filter(w => matchesWork(w, { search, category }))

  if (loading) return <div className="min-h-screen flex items-center justify-center">Yuklanmoqda...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <Link href="/" className="text-xl font-bold text-blue-600">Academic Works</Link>
        <button onClick={() => router.back()} className="text-sm text-blue-600 hover:underline">Orqaga</button>
      </header>
      <div className="max-w-5xl mx-auto p-6 flex flex-col lg:flex-row gap-6 items-start">
        <div className="w-full lg:w-64 flex-shrink-0">
          <div className="bg-white rounded-xl shadow p-6 lg:sticky lg:top-6">
            <div className="mx-auto mb-4 w-20 h-20">
              {profile?.avatar_url ? (
                <Image
                  src={resolveFileUrl(profile.avatar_url)}
                  alt={`${profile?.full_name || 'Foydalanuvchi'} avatari`}
                  width={80}
                  height={80}
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-3xl">
                  {profile?.full_name ? profile.full_name[0].toUpperCase() : '?'}
                </div>
              )}
            </div>
            <h2 className="font-bold text-center text-lg mb-1">{profile?.full_name || "Noma'lum"}</h2>
            {profile?.university && <p className="text-sm text-gray-500 text-center mb-1">🏛️ {profile.university}</p>}
            {profile?.faculty && <p className="text-sm text-gray-500 text-center mb-1">🎓 {profile.faculty}</p>}
            {orcidUrl(profile?.orcid) && (
              <a
                href={orcidUrl(profile.orcid)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex items-center justify-center gap-1 rounded-lg border border-green-200 bg-green-50 px-2 py-1.5 text-xs text-green-700 transition hover:bg-green-100"
              >
                <span className="font-semibold">iD</span> ORCID profili ↗
              </a>
            )}
          </div>
        </div>
        <div className="flex-1 w-full">
          {error && <div className="bg-red-50 text-red-600 text-sm rounded-xl p-4 mb-4">{error}</div>}
          {!profile && !error && (
            <div className="bg-white rounded-xl shadow p-6 mb-4 text-sm text-gray-500">Profil topilmadi</div>
          )}
          {profile?.orcid && <OrcidWorks orcid={profile.orcid} siteWorks={works} />}
          <h3 className="mb-3 font-semibold text-gray-800">Saytdagi ishlar</h3>
          <input
            type="text"
            aria-label="Ishlar ichida qidirish"
            placeholder="Ishlar ichida qidirish..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:border-blue-500 bg-gray-50 mb-4"
          />
          <div className="flex gap-2 mb-4 flex-wrap">
            {CATEGORIES.map((cat, i) => (
              <button key={i} onClick={() => setCategory(i)} aria-pressed={category === i}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${category === i ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 shadow-sm'}`}>
                {cat}
              </button>
            ))}
          </div>
          {filtered.length === 0 ? (
            <div className="bg-white rounded-xl shadow p-12 text-center text-gray-500">
              <p>Hech narsa topilmadi</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(work => (
                <div key={work.id} onClick={() => router.push(`/works/${work.id}`)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(`/works/${work.id}`) } }}
                  role="link" tabIndex={0}
                  className="bg-white rounded-xl shadow p-5 cursor-pointer hover:shadow-md transition">
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1">
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
                          {work.doi && <DoiLink doi={work.doi} stopPropagation />}
                        </div>
                      )}
                    </div>
                    <a href={resolveFileUrl(work.file_url)} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                      className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700 whitespace-nowrap">
                      Yuklab olish
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
