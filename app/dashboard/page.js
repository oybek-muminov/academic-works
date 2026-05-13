'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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
  const [authors, setAuthors] = useState('')
  const [search, setSearch] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [isPublic, setIsPublic] = useState(false)

  const fetchWorks = useCallback(async (userId) => {
    const { data } = await supabase.from('works').select('*').eq('user_id', userId).order('created_at', { ascending: false })
    setWorks(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      fetchWorks(user.id)
    }
    getUser()
  }, [fetchWorks, router])

  const filtered = works.filter(w =>
    search === '' ||
    (w.title && w.title.toLowerCase().includes(search.toLowerCase())) ||
    (w.authors && w.authors.toLowerCase().includes(search.toLowerCase()))
  )

  const handleFileSelect = async (selectedFile) => {
    setFile(selectedFile)
    
    if (!selectedFile.name.endsWith('.pdf')) return
    if (title && authors) return
    
    setAnalyzing(true)
    
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result.split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(selectedFile)
      })

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 500,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'document',
                source: { type: 'base64', media_type: 'application/pdf', data: base64 }
              },
              {
                type: 'text',
                text: 'Extract the title and authors from this academic paper. Reply ONLY with JSON in this exact format, nothing else: {"title": "paper title here", "authors": "Author1, Author2, Author3"}'
              }
            ]
          }]
        })
      })

      const data = await response.json()
      const text = data.content?.[0]?.text || ''
      
      try {
        const parsed = JSON.parse(text)
        if (parsed.title && !title) setTitle(parsed.title)
        if (parsed.authors && !authors) setAuthors(parsed.authors)
      } catch {}
      
    } catch (err) {
      console.error('Auto-detect failed:', err)
    }
    
    setAnalyzing(false)
  }

  const handleUpload = async () => {
    if (!title || !file) return alert('Sarlavha va fayl kerak!')
    setUploading(true)
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}/${Date.now()}.${fileExt}`
    const { error: uploadError } = await supabase.storage.from('works-files').upload(fileName, file)
    if (uploadError) { alert('Fayl yuklanmadi!'); setUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('works-files').getPublicUrl(fileName)
    await supabase.from('works').insert({ user_id: user.id, title, description, authors, category_id: categoryId, is_public: isPublic, file_url: publicUrl, file_name: file.name })
    setTitle(''); setDescription(''); setAuthors(''); setFile(null); setIsPublic(false); setShowForm(false)
    fetchWorks(user.id)
    setUploading(false)
  }

  const handleDelete = async (id) => {
    if (!confirm("O'chirishni tasdiqlaysizmi?")) return
    await supabase.from('works').delete().eq('id', id)
    fetchWorks(user.id)
  }

  const handleVisibilityToggle = async (work) => {
    const nextIsPublic = !work.is_public
    const { error } = await supabase
      .from('works')
      .update({ is_public: nextIsPublic })
      .eq('id', work.id)
      .eq('user_id', user.id)

    if (error) {
      alert('Holat yangilanmadi!')
      return
    }

    setWorks(prev => prev.map(item => (
      item.id === work.id ? { ...item, is_public: nextIsPublic } : item
    )))
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const categories = ['', 'Maqola', 'Tezis', 'Kitob', 'Sertifikat', 'Loyiha', 'Boshqa']

  if (loading) return <div className="min-h-screen flex items-center justify-center">Yuklanmoqda...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <Link href="/" className="text-xl font-bold text-blue-600">Academic Works</Link>
        <div className="flex gap-3 items-center">
          <span className="text-sm text-gray-500">{user?.email}</span>
          <button onClick={() => router.push('/profile')} className="text-sm bg-blue-50 text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition">Profil</button>
          <button onClick={handleLogout} className="text-sm bg-red-50 text-red-500 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-100 transition">Chiqish</button>
        </div>
      </header>
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold">Mening ishlarim ({works.length})</h2>
          <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">+ Yangi ish</button>
        </div>
        <input
          type="text"
          placeholder="Ishlar ichida qidirish..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:border-blue-500 bg-gray-50 mb-4"
        />
        {showForm && (
          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <h3 className="font-semibold mb-4">Yangi ish yuklash</h3>
            <div className="relative mb-3">
              <input
                placeholder={analyzing ? "AI sarlavhani qidiryapti..." : "Sarlavha *"}
                value={title}
                onChange={e => setTitle(e.target.value)}
                disabled={analyzing}
                className="w-full border rounded-lg p-3 outline-none focus:border-blue-500 disabled:bg-gray-50"
              />
              {analyzing && (
                <span className="absolute right-3 top-3 text-blue-500 text-sm animate-pulse">AI tahlil qilyapti...</span>
              )}
            </div>
            <textarea placeholder="Tavsif (ixtiyoriy)" value={description} onChange={e => setDescription(e.target.value)} className="w-full border rounded-lg p-3 mb-3 outline-none focus:border-blue-500 h-24 resize-none" />
            <div className="relative mb-3">
              <input
                placeholder={analyzing ? "AI mualliflarni qidiryapti..." : "Mualliflar"}
                value={authors}
                onChange={e => setAuthors(e.target.value)}
                disabled={analyzing}
                className="w-full border rounded-lg p-3 outline-none focus:border-blue-500 disabled:bg-gray-50"
              />
            </div>
            <select value={categoryId} onChange={e => setCategoryId(Number(e.target.value))} className="w-full border rounded-lg p-3 mb-3 outline-none focus:border-blue-500">
              {categories.map((cat, i) => i > 0 && <option key={i} value={i}>{cat}</option>)}
            </select>
            <div className="flex items-center justify-between border rounded-lg p-3 mb-3">
              <div>
                <p className="text-sm font-medium text-gray-700">
                  {isPublic ? 'Ochiq' : 'Shaxsiy'}
                </p>
                <p className="text-xs text-gray-400">
                  {isPublic ? 'Hamma ko\'ra oladi' : 'Faqat siz ko\'rasiz'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPublic(!isPublic)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isPublic ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isPublic ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
            <div
              onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('border-blue-500', 'bg-blue-50') }}
              onDragLeave={e => { e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50') }}
              onDrop={e => {
                e.preventDefault()
                e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50')
                const droppedFile = e.dataTransfer.files[0]
                if (droppedFile) handleFileSelect(droppedFile)
              }}
              onClick={() => document.getElementById('fileInput').click()}
              className="w-full border-2 border-dashed border-gray-300 rounded-xl p-8 mb-4 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition"
            >
              {file ? (
                <div className="text-green-600">
                  <p className="font-medium">{file.name}</p>
                  <p className="text-xs text-gray-400 mt-1">Boshqa fayl tanlash uchun bosing</p>
                </div>
              ) : (
                <div className="text-gray-400">
                  <p className="font-medium">Faylni shu yerga tashlang</p>
                  <p className="text-sm mt-1">yoki bosib tanlang</p>
                  <p className="text-xs mt-2">PDF, DOC, DOCX, JPG, PNG</p>
                </div>
              )}
            </div>
            <input
              id="fileInput"
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              onChange={e => { if (e.target.files[0]) handleFileSelect(e.target.files[0]) }}
              className="hidden"
            />
            <div className="flex gap-3">
              <button onClick={handleUpload} disabled={uploading} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">{uploading ? 'Yuklanmoqda...' : 'Yuklash'}</button>
              <button onClick={() => setShowForm(false)} className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300">Bekor</button>
            </div>
          </div>
        )}
        {works.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-12 text-center text-gray-400">
            <p>Hali hech qanday ish yuklanmagan</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(work => (
              <div key={work.id} className="bg-white rounded-xl shadow p-5 flex justify-between items-center">
                <div>
                  <h3 className="font-semibold">{work.title}</h3>
                  <p className="text-sm text-gray-500">{categories[work.category_id]} - {new Date(work.created_at).toLocaleDateString('uz')}</p>
                  {work.description && <p className="text-sm text-gray-600 mt-1">{work.description}</p>}
                  {work.authors && <p className="text-xs text-gray-400 mt-1">Mualliflar: {work.authors}</p>}
                </div>
                <div className="flex gap-2 items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{work.is_public ? 'Ochiq' : 'Shaxsiy'}</span>
                    <button
                      type="button"
                      onClick={() => handleVisibilityToggle(work)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        work.is_public ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        work.is_public ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                  <a href={work.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm hover:underline">Ko&apos;rish</a>
                  <button onClick={() => handleDelete(work.id)} className="text-red-500 text-sm hover:underline">O&apos;chirish</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
