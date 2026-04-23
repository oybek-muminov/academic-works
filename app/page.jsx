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

  const categories = ['Barchasi', 'Maqola', 'Tezis', 'Kitob', 'Sertifikat', 'Loyiha', 'Boshqa']

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
    fetchWorks()
  }, [])

  const fetchWorks = async () => {
    const { data } = await supabase
      .from('works')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
    setWorks(data || [])
    setLoading(false)
  }

  const filtered = works.filter(w => {
    const matchSearch = w.title.toLowerCase().includes(search.toLowerCase())
    const matchCat = category === 0 || w.category_id === category
    return matchSearch && matchCat
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-blue-600">Academic Works</h1>
        {user ? (
          <Link href="/dashboard" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
            Dashboard
          </Link>
        ) : (
          <Link href="/login" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
            Kirish
          </Link>
        )}
      </header>

      <div className="bg-blue-600 text-white text-center py-12 px-4">
        <h2 className="text-3xl font-bold mb-2">Universitet Ilmiy Ishlari</h2>
        <p className="text-blue-100 mb-6">Talabalarning maqolalari, tezislari, kitoblari va sertifikatlari</p>
        <input
          type="text"
          placeholder="Ish nomi bo'yicha qidirish..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full max-w-lg px-5 py-3 rounded-xl text-gray-800 outline-none shadow"
        />
      </div>

      <div className="max-w-4xl mx-auto p-6">
        <div className="flex gap-2 mb-6 flex-wrap">
          {categories.map((cat, i) => (
            <button
              key={i}
              onClick={() => setCategory(i)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                category === i ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 shadow-sm'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center text-gray-400 py-12">Yuklanmoqda...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <p className="text-4xl mb-3">🔍</p>
            <p>Hech narsa topilmadi</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(work => (
              <div key={work.id} className="bg-white rounded-xl shadow p-5">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">
                        {categories[work.category_id]}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(work.created_at).toLocaleDateString('uz')}
                      </span>
                    </div>
                    <h3 
                      onClick={() => router.push(`/works/${work.id}`)}
                      className="font-semibold text-gray-800 cursor-pointer hover:text-blue-600"
                    >
                      {work.title}
                    </h3>
                    {work.description && (
                      <p className="text-sm text-gray-500 mt-1">{work.description}</p>
                    )}
                    {work.authors && (
                      <p className="text-xs text-gray-500 mt-1">✍️ {work.authors}</p>
                      )}
                    {work.profiles?.full_name && (
                      <p className="text-xs text-gray-400 mt-1">
                        👤 {work.profiles.full_name}
                        {work.profiles.university && ` • ${work.profiles.university}`}
                      </p>
                    )}
                  </div>
                  <a
                    href={work.file_url}
                    target="_blank"
                    className="ml-4 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 whitespace-nowrap"
                  >
                    ⬇ Yuklab olish
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-center text-sm text-gray-400 mt-8">
          Jami {filtered.length} ta ish topildi
        </p>
      </div>
    </div>
  )
}