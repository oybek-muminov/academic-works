'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { getCurrentUser, supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

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
  const [isPublic, setIsPublic] = useState(false)
  const [profile, setProfile] = useState(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef(null)

  const fetchWorks = useCallback(async (userId) => {
    const { data } = await supabase.from('works').select('*').eq('user_id', userId).order('created_at', { ascending: false })
    setWorks(data || [])
    setLoading(false)
  }, [])

  const fetchProfile = async (userId) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    setProfile(data)
  }

  const handleAvatarUpload = async (file) => {
    if (!file || !user) return
    setUploadingAvatar(true)
    const fileExt = file.name.split('.').pop()
    const fileName = `avatars/${user.id}.${fileExt}`
    const { error: uploadError } = await supabase.storage.from('works-files').upload(fileName, file, { upsert: true })
    if (uploadError) {
      alert('Avatar yuklanmadi!')
      setUploadingAvatar(false)
      return
    }
    const { data: { publicUrl } } = supabase.storage.from('works-files').getPublicUrl(fileName)
    const { error: profileError } = await supabase.from('profiles').upsert({ id: user.id, avatar_url: publicUrl })
    if (profileError) {
      alert('Avatar profilda saqlanmadi!')
      setUploadingAvatar(false)
      return
    }
    setProfile(prev => ({ ...prev, avatar_url: publicUrl }))
    setUploadingAvatar(false)
  }

  useEffect(() => {
    const getUser = async () => {
      const user = await getCurrentUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      fetchWorks(user.id)
      fetchProfile(user.id)
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
  }

  const resetUploadForm = () => {
    setTitle('')
    setDescription('')
    setAuthors('')
    setCategoryId(1)
    setFile(null)
    setIsPublic(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleCancelUpload = () => {
    resetUploadForm()
    setShowForm(false)
  }

  const handleUpload = async () => {
    if (!title || !file) return alert('Sarlavha va fayl kerak!')
    setUploading(true)
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}/${Date.now()}.${fileExt}`
    const { error: uploadError } = await supabase.storage.from('works-files').upload(fileName, file)
    if (uploadError) { alert('Fayl yuklanmadi!'); setUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('works-files').getPublicUrl(fileName)
    const { error: insertError } = await supabase.from('works').insert({ user_id: user.id, title, description, authors, category_id: categoryId, is_public: isPublic, file_url: publicUrl, file_name: file.name })
    if (insertError) {
      alert('Ish bazaga saqlanmadi!')
      setUploading(false)
      return
    }
    resetUploadForm()
    setShowForm(false)
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
  const visibleCategory = (categoryId) => categoryId === 6 ? '' : categories[categoryId]

  if (loading) return <div className="min-h-screen flex items-center justify-center">Yuklanmoqda...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <Link href="/" className="text-xl font-bold text-blue-600">Academic Works</Link>
        <div className="flex gap-3 items-center">
          <button onClick={handleLogout} className="text-sm bg-red-50 text-red-500 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-100 transition">Chiqish</button>
        </div>
      </header>
      <div className="max-w-6xl mx-auto p-6 flex gap-6 items-start">
        {/* LEFT COLUMN - Profile */}
        <div className="w-64 flex-shrink-0">
          <div className="bg-white rounded-xl shadow p-6 sticky top-6">
            
            {/* Avatar */}
            <div className="relative mx-auto w-20 h-20 mb-3">
              {profile?.avatar_url ? (
                <Image src={profile.avatar_url} alt="avatar" width={80} height={80} className="w-20 h-20 rounded-full object-cover mx-auto" />
              ) : (
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-3xl mx-auto">
                  {profile?.full_name ? profile.full_name[0].toUpperCase() : user?.email?.[0].toUpperCase()}
                </div>
              )}
              <label className="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full w-7 h-7 flex items-center justify-center cursor-pointer hover:bg-blue-700 text-sm">
                📷
                <input type="file" accept="image/*" className="hidden" onChange={e => { if(e.target.files[0]) handleAvatarUpload(e.target.files[0]) }} />
              </label>
              {uploadingAvatar && (
                <div className="absolute inset-0 bg-white bg-opacity-70 rounded-full flex items-center justify-center text-xs text-blue-600">⏳</div>
              )}
            </div>

            {/* Name */}
            <h2 className="font-bold text-center text-base mb-1 text-gray-900">
              {profile?.full_name || 'Ism kiritilmagan'}
            </h2>

            {/* Email */}
            <p className="text-xs text-gray-400 text-center mb-3 break-all">{user?.email}</p>

            {/* University & Faculty */}
            {profile?.university && (
              <p className="text-sm text-gray-600 text-center mb-1">🏛 {profile.university}</p>
            )}
            {profile?.faculty && (
              <p className="text-sm text-gray-600 text-center mb-3">📚 {profile.faculty}</p>
            )}

            <button
              onClick={() => router.push('/profile')}
              className="w-full text-sm bg-blue-50 text-blue-600 border border-blue-200 py-2 rounded-lg hover:bg-blue-100 transition"
            >
              ✏️ Profilni tahrirlash
            </button>
          </div>
        </div>
        
        {/* RIGHT COLUMN - Works */}
        <div className="flex-1">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold">Mening ishlarim</h2>
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
            <p className="text-sm text-green-500 mb-3">Sarlavha va mualliflarni hujjatdan nusxa olib joylang. Bu saralash uchun zarur!</p>
            <div className="relative mb-3">
              <input
                placeholder="Sarlavha *"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full border rounded-lg p-3 outline-none focus:border-blue-500"
              />
            </div>
            <textarea placeholder="Tavsif (ixtiyoriy)" value={description} onChange={e => setDescription(e.target.value)} className="w-full border rounded-lg p-3 mb-3 outline-none focus:border-blue-500 h-24 resize-none" />
            <div className="relative mb-3">
              <input
                placeholder="Mualliflar"
                value={authors}
                onChange={e => setAuthors(e.target.value)}
                className="w-full border rounded-lg p-3 outline-none focus:border-blue-500"
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
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-gray-300 rounded-xl p-8 mb-4 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition"
            >
              {file ? (
                <div className="relative text-green-600 group">
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation()
                      setFile(null)
                      if (fileInputRef.current) fileInputRef.current.value = ''
                    }}
                    className="absolute -right-2 -top-4 flex h-7 w-7 items-center justify-center rounded-full border border-red-200 bg-white text-red-500 opacity-0 shadow-sm transition group-hover:opacity-100 hover:bg-red-50"
                    aria-label="Faylni olib tashlash"
                    title="Faylni olib tashlash"
                  >
                    x
                  </button>
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
              ref={fileInputRef}
              id="fileInput"
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              onChange={e => { if (e.target.files[0]) handleFileSelect(e.target.files[0]) }}
              className="hidden"
            />
            <div className="flex gap-3">
              <button onClick={handleUpload} disabled={uploading} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">{uploading ? 'Yuklanmoqda...' : 'Yuklash'}</button>
              <button onClick={handleCancelUpload} className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300">Bekor</button>
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
              <div key={work.id} className="bg-white rounded-xl shadow px-5 flex justify-between items-center py-3">
                <div>
                  {visibleCategory(work.category_id) && <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full mb-2 inline-block">{visibleCategory(work.category_id)}</span>}
                  <h3 className="font-semibold text-gray-900">{work.title}</h3>
                  {work.description && <p className="text-sm text-gray-700 border border-blue-200 mt-1 px-2 py-1"> {work.description}</p>}
                  {work.authors && <p className="text-xs text-gray-600 mt-2">{work.authors}</p>}
                </div>
                <div className="flex gap-2 items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600">{work.is_public ? 'Ochiq' : 'Shaxsiy'}</span>
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
                  <div className="flex flex-col gap-2 items-end">
                    <a href={work.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 bg-blue-50 text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg text-sm hover:bg-blue-100 transition whitespace-nowrap">👁 Ko&apos;rish</a>
                    <button onClick={() => handleDelete(work.id)} className="flex items-center gap-1 bg-red-50 text-red-500 border border-red-200 px-3 py-1.5 rounded-lg text-sm hover:bg-red-100 transition whitespace-nowrap">🗑 O&apos;chirish</button>
                  </div>
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
