'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { getSessionUser, supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { CATEGORIES, CATEGORY_OPTIONS, matchesWork, visibleCategory, doiApiPath, isValidDoi, normalizeDoi, categoryFromCrossrefType } from '../lib/works'
import { categoryFromOrcidType, findSiteMatch, orcidUrl } from '../lib/orcid'
import { useSignedUrls, openWorkFile } from '../lib/files'
import { storagePath } from '../lib/filePath'
import DoiLink from '../components/DoiLink'
import OrcidWorks from '../components/OrcidWorks'

const MAX_FILE_MB = 20

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [works, setWorks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState(1)
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [authors, setAuthors] = useState('')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState(0)
  const [tab, setTab] = useState('works')
  const [isPublic, setIsPublic] = useState(false)
  const [profile, setProfile] = useState(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [doi, setDoi] = useState('')
  const [journal, setJournal] = useState('')
  const [doiYear, setDoiYear] = useState(null)
  const [doiLoading, setDoiLoading] = useState(false)
  const [doiMessage, setDoiMessage] = useState('')
  const [doiError, setDoiError] = useState(false)
  const fileInputRef = useRef(null)
  const lastHydratedDoi = useRef('')
  const resolveFileUrl = useSignedUrls([profile?.avatar_url])

  const fetchWorks = useCallback(async (userId) => {
    const { data, error } = await supabase
      .from('works')
      .select('id,user_id,title,description,authors,category_id,is_public,file_url,file_name,doi,journal,created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) {
      console.error('Works fetch failed:', error)
      setError("Ishlarni yuklab bo'lmadi. Qayta urinib ko'ring.")
    } else {
      setWorks(data || [])
    }
    setLoading(false)
  }, [])

  const fetchProfile = useCallback(async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('id,full_name,username,university,faculty,avatar_url,orcid')
      .eq('id', userId)
      .maybeSingle()
    setProfile(data)
  }, [])

  const handleOpenFile = async (work) => {
    try {
      await openWorkFile(work.file_url, work.file_name)
    } catch (err) {
      alert(err.message)
    }
  }

  const handleAvatarUpload = async (file) => {
    if (!file || !user) return
    if (!file.type.startsWith('image/')) {
      alert('Faqat rasm fayl yuklang!')
      return
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      alert(`Rasm hajmi ${MAX_FILE_MB} MB dan oshmasligi kerak!`)
      return
    }
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

  // Crossref'dan DOI bo'yicha ma'lumot oladi.
  const fetchDoiData = async (value) => {
    const response = await fetch(`/api/doi/${doiApiPath(value)}`)
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || "Crossref'da topilmadi.")
    return data
  }

  // DOI kiritilganda sarlavha, mualliflar va jurnalni Crossref'dan to'ldiradi.
  const fillFromDoi = async (rawDoi = doi, { force = false } = {}) => {
    const value = normalizeDoi(rawDoi)
    if (!value) return
    if (!isValidDoi(value)) {
      setDoiError(true)
      setDoiMessage("DOI noto'g'ri. Masalan: 10.1038/nature12373")
      return
    }
    if (doiLoading) return
    if (!force && lastHydratedDoi.current === value) return

    setDoi(value)
    setDoiLoading(true)
    setDoiMessage('')
    setDoiError(false)

    try {
      const data = await fetchDoiData(value)

      const filled = []
      if (data.title && !title.trim()) { setTitle(data.title); filled.push('sarlavha') }
      if (data.authors && !authors.trim()) { setAuthors(data.authors); filled.push('mualliflar') }
      if (data.journal) { setJournal(data.journal); filled.push('jurnal') }
      const suggested = categoryFromCrossrefType(data.type)
      if (categoryId === 1 && suggested) setCategoryId(suggested)
      setDoiYear(data.year || null)
      lastHydratedDoi.current = value
      setDoiMessage(
        filled.length
          ? `Crossref'dan to'ldirildi: ${filled.join(', ')}.`
          : "Ma'lumot olindi, lekin maydonlar allaqachon to'ldirilgan."
      )
    } catch (err) {
      setDoiError(true)
      setDoiMessage(err.message)
    } finally {
      setDoiLoading(false)
    }
  }

  useEffect(() => {
    const getUser = async () => {
      const currentUser = await getSessionUser()
      if (!currentUser) { router.push('/login'); return }
      setUser(currentUser)
      await Promise.all([fetchWorks(currentUser.id), fetchProfile(currentUser.id)])
    }
    getUser()
  }, [fetchWorks, fetchProfile, router])

  const filtered = works.filter(w => matchesWork(w, { search, category }))
  const publicCount = works.filter(w => w.is_public).length
  const hasOrcid = Boolean(profile?.orcid && orcidUrl(profile.orcid))

  // ORCID nashrini saytga qo'shadi: fayl talab qilinmaydi, avval "Shaxsiy" holatda.
  const handleOrcidImport = async (item) => {
    if (!user) return { error: 'Avval tizimga kiring.' }
    if (!item?.title) return { error: 'Sarlavha topilmadi.' }
    if (findSiteMatch(item, works)) return { error: 'Bu ish allaqachon saytda bor.' }

    const { data, error: insertError } = await supabase
      .from('works')
      .insert({
        user_id: user.id,
        title: item.title,
        authors: item.authors || null,
        category_id: categoryFromOrcidType(item.type),
        is_public: false,
        doi: normalizeDoi(item.doi) || null,
        journal: item.journal || null,
      })
      .select('*')
      .single()

    if (insertError) {
      console.error('ORCID import failed:', insertError)
      return { error: "Ishni saqlab bo'lmadi. Qayta urinib ko'ring." }
    }

    if (data) setWorks(prev => [data, ...prev])
    return { ok: true }
  }

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
    setDoi('')
    setJournal('')
    setDoiYear(null)
    setDoiMessage('')
    setDoiError(false)
    lastHydratedDoi.current = ''
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleCancelUpload = () => {
    resetUploadForm()
    setShowForm(false)
  }

  const handleUpload = async () => {
    if (uploading || !user) return

    const cleanDoi = normalizeDoi(doi)
    let finalTitle = title.trim()
    let finalAuthors = authors.trim()
    let finalJournal = journal.trim()
    let finalCategory = categoryId

    setUploading(true)

    try {
      // DOI kiritilgan bo'lsa, bo'sh maydonlarni Crossref'dan avtomatik to'ldiramiz.
      if (cleanDoi && (!finalTitle || !finalAuthors || !finalJournal)) {
        if (!isValidDoi(cleanDoi)) {
          setDoiError(true)
          setDoiMessage("DOI noto'g'ri. Masalan: 10.1038/nature12373")
          return
        }

        try {
          const data = await fetchDoiData(cleanDoi)
          finalTitle = finalTitle || (data.title || '').trim()
          finalAuthors = finalAuthors || (data.authors || '').trim()
          finalJournal = finalJournal || (data.journal || '').trim()
          const suggested = categoryFromCrossrefType(data.type)
          if (categoryId === 1 && suggested) finalCategory = suggested

          setDoi(cleanDoi)
          setTitle(finalTitle)
          setAuthors(finalAuthors)
          setJournal(finalJournal)
          setCategoryId(finalCategory)
          setDoiYear(data.year || null)
          setDoiError(false)
          setDoiMessage("Crossref'dan avtomatik to'ldirildi.")
          lastHydratedDoi.current = cleanDoi
        } catch (err) {
          // Sarlavha qo'lda kiritilgan bo'lsa, DOI xatosiga qaramay davom etamiz.
          if (!finalTitle) {
            setDoiError(true)
            setDoiMessage(err.message)
            return
          }
        }
      }

      if (!finalTitle) {
        alert('Sarlavha kerak yoki DOI kiriting!')
        return
      }

      let fileUrl = null
      let storedFileName = null

      if (file) {
        if (file.size > MAX_FILE_MB * 1024 * 1024) {
          alert(`Fayl hajmi ${MAX_FILE_MB} MB dan oshmasligi kerak!`)
          return
        }
        const fileExt = file.name.split('.').pop() || 'bin'
        const storageName = `${user.id}/${Date.now()}.${fileExt}`
        const { error: uploadError } = await supabase.storage.from('works-files').upload(storageName, file)
        if (uploadError) {
          alert('Fayl yuklanmadi!')
          return
        }
        const { data: { publicUrl } } = supabase.storage.from('works-files').getPublicUrl(storageName)
        fileUrl = publicUrl
        storedFileName = file.name
      }

      const { error: insertError } = await supabase.from('works').insert({
        user_id: user.id,
        title: finalTitle,
        description,
        authors: finalAuthors || null,
        category_id: finalCategory,
        is_public: isPublic,
        file_url: fileUrl,
        file_name: storedFileName,
        doi: cleanDoi || null,
        journal: finalJournal || null,
      })

      if (insertError) {
        const path = storagePath(fileUrl)
        if (path) await supabase.storage.from('works-files').remove([path])
        alert('Ish bazaga saqlanmadi!')
        return
      }

      resetUploadForm()
      setShowForm(false)
      fetchWorks(user.id)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (work) => {
    if (!confirm("O'chirishni tasdiqlaysizmi?")) return
    const { error } = await supabase.from('works').delete().eq('id', work.id)
    if (error) {
      alert("O'chirib bo'lmadi!")
      return
    }
    const path = storagePath(work.file_url)
    if (path) await supabase.storage.from('works-files').remove([path])
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

  if (loading) return <div className="min-h-screen flex items-center justify-center">Yuklanmoqda...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <Link href="/" className="text-xl font-bold text-blue-600">Academic Works</Link>
        <div className="flex gap-3 items-center">
          <button onClick={handleLogout} className="text-sm bg-red-50 text-red-500 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-100 transition">Chiqish</button>
        </div>
      </header>
      <div className="max-w-6xl mx-auto p-6 flex flex-col lg:flex-row gap-6 items-start">
        {/* LEFT COLUMN - Profile */}
        <div className="w-full lg:w-64 flex-shrink-0">
          <div className="bg-white rounded-xl shadow p-6 lg:sticky lg:top-6">
            
            {/* Avatar */}
            <div className="relative mx-auto w-20 h-20 mb-3">
              {profile?.avatar_url ? (
                <Image src={resolveFileUrl(profile.avatar_url)} alt="Profil avatari" width={80} height={80} className="w-20 h-20 rounded-full object-cover mx-auto" />
              ) : (
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-3xl mx-auto">
                  {profile?.full_name ? profile.full_name[0].toUpperCase() : user?.email?.[0].toUpperCase()}
                </div>
              )}
              <label className="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full w-7 h-7 flex items-center justify-center cursor-pointer hover:bg-blue-700 text-sm" title="Avatar yuklash">
                <span aria-hidden="true">📷</span>
                <span className="sr-only">Avatar yuklash</span>
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
            <p className="text-xs text-gray-500 text-center mb-3 break-all">{user?.email}</p>

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

            {user && (
              <Link
                href={`/user/${user.id}`}
                className="mt-2 block w-full text-center text-sm bg-white text-gray-600 border border-gray-200 py-2 rounded-lg hover:bg-gray-50 transition"
              >
                Ommaviy profilim ↗
              </Link>
            )}

            {hasOrcid ? (
              <a
                href={orcidUrl(profile.orcid)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 block rounded-lg border border-green-200 bg-green-50 px-2 py-2 text-center text-xs text-green-700 transition hover:bg-green-100"
              >
                <span className="font-semibold">iD</span> ORCID ulangan
                <span className="mt-0.5 block font-mono text-[10px] text-green-600">{profile.orcid}</span>
              </a>
            ) : (
              <button
                onClick={() => router.push('/profile')}
                className="mt-2 w-full rounded-lg border border-dashed border-green-300 bg-green-50 px-2 py-2 text-xs text-green-700 transition hover:bg-green-100"
              >
                ➕ ORCID iD qo&apos;shish
              </button>
            )}
          </div>
        </div>
        
        {/* RIGHT COLUMN - Works */}
        <div className="flex-1 w-full">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Mening ishlarim</h2>
            <p className="text-xs text-gray-500">
              {works.length} ta ish · {publicCount} ta ochiq
            </p>
          </div>
          <button
            onClick={() => { setTab('works'); setShowForm(!showForm) }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            + Yangi ish
          </button>
        </div>

        <div className="mb-4 flex flex-wrap gap-1 rounded-xl bg-gray-100 p-1" role="tablist" aria-label="Dashboard bo'limlari">
          <button
            role="tab"
            aria-selected={tab === 'works'}
            onClick={() => setTab('works')}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
              tab === 'works' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Saytdagi ishlar ({works.length})
          </button>
          {hasOrcid && (
            <button
              role="tab"
              aria-selected={tab === 'orcid'}
              onClick={() => setTab('orcid')}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                tab === 'orcid' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              ORCID nashrlari
            </button>
          )}
        </div>

        {error && <div className="bg-red-50 text-red-600 text-sm rounded-xl p-4 mb-4">{error}</div>}

        {tab === 'works' ? (
        <>
        <input
          type="text"
          aria-label="Ishlar ichida qidirish"
          placeholder="Sarlavha, muallif, jurnal yoki DOI bo'yicha qidirish..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none focus:border-blue-500 bg-gray-50 mb-3"
        />
        <div className="mb-4 flex flex-wrap gap-2">
          {CATEGORIES.map((cat, i) => (
            <button
              key={i}
              onClick={() => setCategory(i)}
              aria-pressed={category === i}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                category === i ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 shadow-sm'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        {showForm && (
          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <h3 className="font-semibold mb-4">Yangi ish yuklash</h3>
            <p className="text-sm text-green-500 mb-3">DOI raqamini kiriting va «Yuklash»ni bosing — sarlavha, mualliflar va jurnal o&apos;zi to&apos;ldiriladi. Fayl yuklash shart emas.</p>
            <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
              <label htmlFor="doiInput" className="mb-1 block text-xs font-medium text-blue-800">
                DOI (ixtiyoriy)
              </label>
              <div className="flex gap-2">
                <input
                  id="doiInput"
                  aria-label="DOI"
                  placeholder="10.1038/nature12373"
                  value={doi}
                  onChange={e => { setDoi(e.target.value); setDoiMessage(''); setDoiError(false) }}
                  onBlur={() => { if (doi.trim()) fillFromDoi() }}
                  className="min-w-0 flex-1 rounded-lg border border-blue-200 bg-white p-2 text-sm outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => fillFromDoi(doi, { force: true })}
                  disabled={doiLoading || !doi.trim()}
                  className="whitespace-nowrap rounded-lg bg-blue-600 px-3 py-2 text-sm text-white transition hover:bg-blue-700 disabled:opacity-50"
                >
                  {doiLoading ? 'Yuklanmoqda...' : 'To\'ldirish'}
                </button>
              </div>
              <p className="mt-1 text-[11px] text-blue-700">
                DOI kiritilsa sarlavha, mualliflar va jurnal avtomatik to&apos;ldiriladi. Fayl yuklash ixtiyoriy.
              </p>
              {doiMessage && (
                <p className={`mt-1 text-xs ${doiError ? 'text-red-600' : 'text-green-700'}`}>{doiMessage}</p>
              )}
              {journal && !doiError && (
                <p className="mt-1 text-xs text-blue-800">
                  Jurnal: <span className="font-medium">{journal}</span>{doiYear ? ` (${doiYear})` : ''}
                </p>
              )}
            </div>
            <div className="relative mb-3">
              <input
                aria-label="Sarlavha"
                placeholder="Sarlavha *"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full border rounded-lg p-3 outline-none focus:border-blue-500"
              />
            </div>
            <textarea aria-label="Tavsif" placeholder="Tavsif (ixtiyoriy)" value={description} onChange={e => setDescription(e.target.value)} className="w-full border rounded-lg p-3 mb-3 outline-none focus:border-blue-500 h-24 resize-none" />
            <div className="relative mb-3">
              <input
                aria-label="Mualliflar"
                placeholder="Mualliflar"
                value={authors}
                onChange={e => setAuthors(e.target.value)}
                className="w-full border rounded-lg p-3 outline-none focus:border-blue-500"
              />
            </div>
            <select value={categoryId} onChange={e => setCategoryId(Number(e.target.value))} className="w-full border rounded-lg p-3 mb-3 outline-none focus:border-blue-500">
              {CATEGORY_OPTIONS.map((cat, i) => <option key={cat} value={i + 1}>{cat}</option>)}
            </select>
            <div className="flex items-center justify-between border rounded-lg p-3 mb-3">
              <div>
                <p className="text-sm font-medium text-gray-700">
                  {isPublic ? 'Ochiq' : 'Shaxsiy'}
                </p>
                <p className="text-xs text-gray-500">
                  {isPublic ? 'Hamma ko\'ra oladi' : 'Faqat siz ko\'rasiz'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPublic(!isPublic)}
                role="switch"
                aria-checked={isPublic}
                aria-label="Ishni ochiq qilish"
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
                  <p className="text-xs text-gray-500 mt-1">Boshqa fayl tanlash uchun bosing</p>
                </div>
              ) : (
                <div className="text-gray-500">
                  <p className="font-medium">Fayl (ixtiyoriy) — shu yerga tashlang</p>
                  <p className="text-sm mt-1">yoki bosib tanlang</p>
                  <p className="text-xs mt-2">DOI orqali qo&apos;shsangiz, fayl shart emas · PDF, DOC, DOCX, JPG, PNG</p>
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
        {!error && (works.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-12 text-center text-gray-500">
            <p>Hali hech qanday ish yuklanmagan</p>
            {hasOrcid && (
              <button
                onClick={() => setTab('orcid')}
                className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700 transition hover:bg-blue-100"
              >
                ORCID&apos;dagi nashrlarni ko&apos;rish →
              </button>
            )}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-12 text-center text-gray-500">
            <p>Hech narsa topilmadi</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(work => (
              <div key={work.id} className="bg-white rounded-xl shadow px-5 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 py-3">
                <div>
                  {visibleCategory(work.category_id) && <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full mb-2 inline-block">{visibleCategory(work.category_id)}</span>}
                  <h3 className="font-semibold text-gray-900">{work.title}</h3>
                  {work.description && <p className="text-sm text-gray-700 border border-blue-200 mt-1 px-2 py-1"> {work.description}</p>}
                  {work.authors && <p className="text-xs text-gray-600 mt-2">{work.authors}</p>}
                  {(work.journal || work.doi) && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {work.journal && <span className="text-xs text-gray-500">{work.journal}</span>}
                      {work.doi && <DoiLink doi={work.doi} />}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 items-center justify-between sm:justify-end">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600">{work.is_public ? 'Ochiq' : 'Shaxsiy'}</span>
                    <button
                      type="button"
                      onClick={() => handleVisibilityToggle(work)}
                      role="switch"
                      aria-checked={work.is_public}
                      aria-label={`${work.title} — ${work.is_public ? 'ochiq' : 'shaxsiy'}`}
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
                    {work.file_url ? (
                      <button type="button" onClick={() => handleOpenFile(work)} className="flex items-center gap-1 bg-blue-50 text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg text-sm hover:bg-blue-100 transition whitespace-nowrap">👁 Ko&apos;rish</button>
                    ) : (
                      <span className="border border-gray-200 px-3 py-1.5 text-xs text-gray-400 whitespace-nowrap">Fayl yuklanmagan</span>
                    )}
                    <button onClick={() => handleDelete(work)} className="flex items-center gap-1 bg-red-50 text-red-500 border border-red-200 px-3 py-1.5 rounded-lg text-sm hover:bg-red-100 transition whitespace-nowrap">🗑 O&apos;chirish</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
        </>
        ) : (
          <OrcidWorks
            orcid={profile.orcid}
            siteWorks={works}
            onImport={handleOrcidImport}
            onOpenWorks={() => setTab('works')}
          />
        )}
        </div>
      </div>
    </div>
  )
}
