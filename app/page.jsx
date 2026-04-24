'use client'
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()
  const [works, setWorks] = useState([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState(0)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [uploaderProfiles, setUploaderProfiles] = useState({})

  const categories = ['Barchasi', 'Maqola', 'Tezis', 'Kitob', 'Sertifikat', 'Loyiha', 'Boshqa']

  async function fetchWorks() {
    const { data } = await supabase
      .from('works')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
    const seen = new Set()
    const unique = (data || []).filter(work => {
      const key = (work.title || '').toLowerCase().trim() + '|||' + (work.authors || '').toLowerCase().trim()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    setWorks(unique)
    setLoading(false)
  }

  const fetchUploader = async (workId, userId) => {
    if (uploaderProfiles[workId]) {
      setExpandedId(expandedId === workId ? null : workId)
      return
    }
    const { data } = await supabase
      .from('profiles')
      .select('full_name, university')
      .eq('id', userId)
      .single()
    setUploaderProfiles(prev => ({ ...prev, [workId]: data }))
    setExpandedId(expandedId === workId ? null : workId)
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
    fetchWorks()
  }, [])

  const filtered = works.filter(w => {
    const matchSearch = search === '' ||
      (w.title && w.title.toLowerCase().includes(search.toLowerCase())) ||
      (w.authors && w.authors.toLowerCase().includes(search.toLowerCase()))
    const matchCat = category === 0 || w.category_id === category
    return matchSearch && matchCat
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-600 shadow-sm px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-3">
            <h1 className="text-2xl font-bold text-white">Ilmiy ishlar bazasi</h1>
            {user ? (
              <Link href="/dashboard" className="border border-white text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">Dashboard</Link>
            ) : (
              <Link href="/login" className="border border-white text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">Kirish</Link>
            )}
          </div>
          <input
            type="text"
            placeholder="Maqola nomi yoki muallif ismi bo'yicha qidirish..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-4 py-2 border border-blue-400 rounded-xl outline-none focus:border-white bg-white bg-opacity-90 text-gray-700"
          />
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6">
        <div className="flex gap-2 mb-6 flex-wrap">
          {categories.map((cat, i) => (
            <button key={i} onClick={() => setCategory(i)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${category === i ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 shadow-sm'}`}>
              {cat}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center text-gray-400 py-12">Yuklanmoqda...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <p className="text-4xl mb-3">💡</p>
            <p>Hech narsa topilmadi</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(work => (
              <div key={work.id} className="bg-white rounded-xl shadow p-5">
                <div className="flex justify-between items-start">
                  <div className="flex-1 pr-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">{categories[work.category_id]}</span>
                      <span className="text-xs text-gray-400">{new Date(work.created_at).toLocaleDateString('uz')}</span>
                    </div>
                    <h3 className="font-semibold text-gray-800">{work.title}</h3>
                    {work.description && <p className="text-sm text-gray-500 mt-1">{work.description}</p>}
                    {work.authors && <p className="text-xs text-gray-500 mt-1">✍️ {work.authors}</p>}
                  </div>
                  <div className="flex flex-col gap-2 items-end flex-shrink-0">
                    <a href={work.file_url} target="_blank"
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 whitespace-nowrap">
                      ⬇ Yuklab olish
                    </a>
                    <button
                      onClick={() => fetchUploader(work.id, work.user_id)}
                      className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg text-sm hover:bg-blue-200 whitespace-nowrap">
                      👥 Yuklaganlar
                    </button>
                  </div>
                </div>
                {expandedId === work.id && (
                  <div className="mt-3 border-t pt-3">
                    <div className="bg-blue-50 rounded-xl p-3">
                      {uploaderProfiles[work.id] ? (
                        <div
                          onClick={() => router.push(`/user/${work.user_id}`)}
                          className="bg-white rounded-lg px-4 py-2 text-sm cursor-pointer hover:bg-blue-100 transition flex items-center gap-3"
                        >
                          <div className="w-8 h-8 bg-blue-200 rounded-full flex items-center justify-center text-blue-700 font-bold text-sm flex-shrink-0">
                            {uploaderProfiles[work.id].full_name ? uploaderProfiles[work.id].full_name[0].toUpperCase() : '?'}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{uploaderProfiles[work.id].full_name || "Noma'lum"}</p>
                            {uploaderProfiles[work.id].university && (
                              <p className="text-xs text-gray-400">{uploaderProfiles[work.id].university}</p>
                            )}
                          </div>
                          <span className="ml-auto text-blue-600 text-xs">Profilni ko'rish →</span>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400 text-center py-2">Yuklanmoqda...</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        <p className="text-center text-sm text-gray-400 mt-8">Jami {filtered.length} ta ish topildi</p>
      </div>
    </div>
  )
}
