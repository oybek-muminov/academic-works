'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [works, setWorks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState(1)
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      fetchWorks(user.id)
    }
    getUser()
  }, [])

  const fetchWorks = async (userId) => {
    const { data } = await supabase
      .from('works')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    setWorks(data || [])
    setLoading(false)
  }

  const handleUpload = async () => {
    if (!title || !file) return alert('Sarlavha va fayl kerak!')
    setUploading(true)

    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}/${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('works-files')
      .upload(fileName, file)

    if (uploadError) { alert('Fayl yuklanmadi!'); setUploading(false); return }

    const { data: { publicUrl } } = supabase.storage
      .from('works-files')
      .getPublicUrl(fileName)

    await supabase.from('works').insert({
      user_id: user.id,
      title,
      description,
      category_id: categoryId,
      file_url: publicUrl,
      file_name: file.name,
    })

    setTitle(''); setDescription(''); setFile(null); setShowForm(false)
    fetchWorks(user.id)
    setUploading(false)
  }

  const handleDelete = async (id, fileUrl) => {
    if (!confirm('O\'chirishni tasdiqlaysizmi?')) return
    await supabase.from('works').delete().eq('id', id)
    fetchWorks(user.id)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const categories = ['', 'Maqola', 'Tezis', 'Kitob', 'Sertifikat', 'Loyiha', 'Boshqa']

  if (loading) return <div className="min-h-screen flex items-center justify-center">Yuklanmoqda...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-blue-600">Academic Works</h1>
        <div className="flex gap-3">
          <span className="text-sm text-gray-500">{user?.email}</span>
          <button onClick={handleLogout} className="text-sm text-red-500 hover:underline">Chiqish</button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6">
        {/* Yangi ish qo'shish tugmasi */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold">Mening ishlarim ({works.length})</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            + Yangi ish
          </button>
        </div>

        {/* Yuklash formasi */}
        {showForm && (
          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <h3 className="font-semibold mb-4">Yangi ish yuklash</h3>
            <input
              placeholder="Sarlavha *"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full border rounded-lg p-3 mb-3 outline-none focus:border-blue-500"
            />
            <textarea
              placeholder="Tavsif (ixtiyoriy)"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full border rounded-lg p-3 mb-3 outline-none focus:border-blue-500 h-24 resize-none"
            />
            <select
              value={categoryId}
              onChange={e => setCategoryId(Number(e.target.value))}
              className="w-full border rounded-lg p-3 mb-3 outline-none focus:border-blue-500"
            >
              {categories.map((cat, i) => i > 0 && <option key={i} value={i}>{cat}</option>)}
            </select>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              onChange={e => setFile(e.target.files[0])}
              className="w-full border rounded-lg p-3 mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {uploading ? 'Yuklanmoqda...' : 'Yuklash'}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300"
              >
                Bekor
              </button>
            </div>
          </div>
        )}

        {/* Ishlar ro'yxati */}
        {works.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-12 text-center text-gray-400">
            <p className="text-4xl mb-3">📄</p>
            <p>Hali hech qanday ish yuklanmagan</p>
          </div>
        ) : (
          <div className="space-y-3">
            {works.map(work => (
              <div key={work.id} className="bg-white rounded-xl shadow p-5 flex justify-between items-center">
                <div>
                  <h3 className="font-semibold">{work.title}</h3>
                  <p className="text-sm text-gray-500">{categories[work.category_id]} • {new Date(work.created_at).toLocaleDateString('uz')}</p>
                  {work.description && <p className="text-sm text-gray-600 mt-1">{work.description}</p>}
                </div>
                <div className="flex gap-2">
                  <a href={work.file_url} target="_blank" className="text-blue-600 text-sm hover:underline">Ko'rish</a>
                  <button onClick={() => handleDelete(work.id)} className="text-red-500 text-sm hover:underline">O'chirish</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}