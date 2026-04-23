'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

export default function WorkDetail() {
  const { id } = useParams()
  const router = useRouter()
  const [work, setWork] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const categories = ['', 'Maqola', 'Tezis', 'Kitob', 'Sertifikat', 'Loyiha', 'Boshqa']

  useEffect(() => {
    const fetchWork = async () => {
      const { data: work } = await supabase.from('works').select('*').eq('id', id).single()
      if (!work) { router.push('/'); return }
      setWork(work)
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', work.user_id).single()
      setProfile(profile)
      setLoading(false)
    }
    fetchWork()
  }, [id])

  if (loading) return <div className="min-h-screen flex items-center justify-center">Yuklanmoqda...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <Link href="/" className="text-xl font-bold text-blue-600">← Bosh sahifa</Link>
        <button onClick={() => router.back()} className="text-sm text-blue-600 hover:underline">← Orqaga</button>
      </header>
      <div className="max-w-3xl mx-auto p-6 space-y-4">
        <div className="bg-white rounded-xl shadow p-6">
          <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">{categories[work.category_id]}</span>
          <h2 className="text-xl font-bold mt-3 mb-2">{work.title}</h2>
          {work.description && <p className="text-gray-600 mb-3">{work.description}</p>}
          {work.authors && <p className="text-sm text-gray-500 mb-4">✍️ {work.authors}</p>}
          <p className="text-xs text-gray-400 mb-4">{new Date(work.created_at).toLocaleDateString('uz')}</p>
          <a href={work.file_url} target="_blank" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 inline-block">⬇ Yuklab olish</a>
        </div>
        {profile && (
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="font-semibold text-gray-700 mb-3">📋 Yuklagan foydalanuvchi</h3>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-lg">
                {profile.full_name ? profile.full_name[0] : '?'}
              </div>
              <div>
                <p className="font-semibold">{profile.full_name || "Noma'lum"}</p>
                {profile.university && <p className="text-sm text-gray-500">{profile.university}</p>}
                {profile.faculty && <p className="text-sm text-gray-500">{profile.faculty}</p>}
                {profile.year && <p className="text-sm text-gray-400">{profile.year}-kurs</p>}
              </div>
            </div>
            <Link href={`/user/${work.user_id}`} className="mt-4 inline-block text-sm text-blue-600 hover:underline">Barcha ishlarini ko'rish →</Link>
          </div>
        )}
      </div>
    </div>
  )
}
