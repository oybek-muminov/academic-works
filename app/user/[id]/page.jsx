'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

export default function UserProfile() {
  const { id } = useParams()
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [works, setWorks] = useState([])
  const [category, setCategory] = useState(0)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const categories = ['Barchasi', 'Maqola', 'Tezis', 'Kitob', 'Sertifikat', 'Loyiha', 'Boshqa']

  useEffect(() => {
    const fetchData = async () => {
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', id).single()
      setProfile(profile)
      const { data: works } = await supabase.from('works').select('*').eq('user_id', id).eq('is_public', true).order('created_at', { ascending: false })
      setWorks(works || [])
      setLoading(false)
    }
    fetchData()
  }, [id])

  const filtered = works.filter(w => {
    const matchSearch = search === '' ||
      (w.title && w.title.toLowerCase().includes(search.toLowerCase())) ||
      (w.authors && w.authors.toLowerCase().includes(search.toLowerCase()))
    const matchCat = category === 0 || w.category_id === category
    return matchSearch && matchCat
  })

  if (loading) return <div className="min-h-screen flex items-center justify-center">Yuklanmoqda...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <Link href="/" className="text-xl font-bold text-blue-600">Academic Works</Link>
        <button onClick={() => router.back()} className="text-sm text-blue-600 hover:underline">Orqaga</button>
      </header>
      <div className="max-w-5xl mx-auto p-6 flex gap-6 items-start">
        <div className="w-64 flex-shrink-0">
          <div className="bg-white rounded-xl shadow p-6 sticky top-6">
            <div className="mx-auto mb-4 w-20 h-20">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="avatar"
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-3xl">
                  {profile?.full_name ? profile.full_name[0].toUpperCase() : '?'}
                </div>
              )}
            </div>
            <h2 className="font-bold text-center text-lg mb-1">{profile?.full_name || "Noma'lum"}</h2>
            {profile?.university && <p className="text-sm text-gray-500 text-center mb-1">{profile.university}</p>}
            {profile?.faculty && <p className="text-sm text-gray-500 text-center mb-1">{profile.faculty}</p>}
            <div className="border-t pt-3 text-center">
              <p className="text-2xl font-bold text-blue-600">{works.length}</p>
              <p className="text-xs text-gray-400">ta ish yuklagan</p>
            </div>
          </div>
        </div>
        <div className="flex-1">
          <input
            type="text"
            placeholder="Ishlar ichida qidirish..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:border-blue-500 bg-gray-50 mb-4"
          />
          <div className="flex gap-2 mb-4 flex-wrap">
            {categories.map((cat, i) => (
              <button key={i} onClick={() => setCategory(i)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${category === i ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 shadow-sm'}`}>
                {cat}
              </button>
            ))}
          </div>
          {filtered.length === 0 ? (
            <div className="bg-white rounded-xl shadow p-12 text-center text-gray-400">
              <p>Hech narsa topilmadi</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(work => (
                <div key={work.id} onClick={() => router.push(`/works/${work.id}`)} className="bg-white rounded-xl shadow p-5 cursor-pointer hover:shadow-md transition">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">{categories[work.category_id]}</span>
                        <span className="text-xs text-gray-400">{new Date(work.created_at).toLocaleDateString('uz')}</span>
                      </div>
                      <h3 className="font-semibold text-gray-800">{work.title}</h3>
                      {work.description && <p className="text-sm text-gray-500 mt-1">{work.description}</p>}
                      {work.authors && <p className="text-xs text-gray-400 mt-1">Mualliflar: {work.authors}</p>}
                    </div>
                    <a href={work.file_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                      className="ml-4 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700 whitespace-nowrap">
                      Yuklab olish
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-center text-sm text-gray-400 mt-6">Jami {filtered.length} ta ish</p>
        </div>
      </div>
    </div>
  )
}
