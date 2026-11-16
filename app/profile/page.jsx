'use client'
import { useState, useEffect } from 'react'
import { getCurrentUser, supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import { isValidOrcid, normalizeOrcid } from '../lib/orcid'

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [fullName, setFullName] = useState('')
  const [university, setUniversity] = useState('')
  const [faculty, setFaculty] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [username, setUsername] = useState('')
  const [orcid, setOrcid] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [passwordError, setPasswordError] = useState('')

  useEffect(() => {
    const getProfile = async () => {
      const user = await getCurrentUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
      if (data) { setFullName(data.full_name || ''); setUniversity(data.university || ''); setFaculty(data.faculty || ''); setUsername(data.username || ''); setOrcid(data.orcid || '') }
      setLoading(false)
    }
    getProfile()
  }, [router])

  const handleSave = async () => {
    setError('')
    setSuccess(false)
    if (!fullName.trim()) {
      setError("To'liq ismni kiriting")
      return
    }

    const cleanUsername = username.trim().toLowerCase()
    if (cleanUsername && !/^[a-z0-9_]{3,30}$/.test(cleanUsername)) {
      setError('Username 3-30 belgidan iborat bo\'lsin: lotin harflari, raqam va _')
      return
    }

    const cleanOrcid = orcid.trim() ? normalizeOrcid(orcid) : ''
    if (orcid.trim() && !isValidOrcid(cleanOrcid)) {
      setError("ORCID iD noto'g'ri. Ko'rinishi: 0000-0002-1825-0097")
      return
    }

    setSaving(true)
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        full_name: fullName.trim(),
        university,
        faculty,
        username: cleanUsername || null,
        orcid: cleanOrcid || null,
      })

    const { error: loginError } = profileError ? { error: profileError } : cleanUsername
      ? await supabase.from('profile_logins').upsert(
          { user_id: user.id, username: cleanUsername, email: user.email },
          { onConflict: 'user_id' }
        )
      : await supabase.from('profile_logins').delete().eq('user_id', user.id)

    setSaving(false)

    if (loginError) {
      setError(loginError.code === '23505' ? 'Bu username allaqachon band' : "Profil saqlanmadi. Qayta urinib ko'ring.")
      return
    }

    setUsername(cleanUsername)
    setOrcid(cleanOrcid)
    setSuccess(true)
    setTimeout(() => setSuccess(false), 2000)
  }

  const handlePasswordChange = async () => {
    if (newPassword.length < 6) { setPasswordError("Parol kamida 6 ta belgi bo'lsin"); return }
    setPasswordError('')
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) setPasswordError(error.message)
    else {
      setPasswordSuccess(true)
      setNewPassword('')
      setTimeout(() => setPasswordSuccess(false), 3000)
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Yuklanmoqda...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <button onClick={() => router.push('/dashboard')} className="text-sm bg-blue-50 text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition">Dashboard</button>
      </header>
      <div className="max-w-lg mx-auto p-6">
        <h2 className="text-lg font-semibold mb-6">Profil sozlamalari</h2>
        <div className="bg-white rounded-xl shadow p-6 space-y-4">
          <div>
            <label className="text-sm text-gray-600 mb-1 block">To&apos;liq ism *</label>
            <input aria-label="To'liq ism" placeholder="Ism Familiya" value={fullName} onChange={e => setFullName(e.target.value)} className="w-full border rounded-lg p-3 outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Universitet</label>
            <input aria-label="Universitet" placeholder="Masalan: TATU, NUUz..." value={university} onChange={e => setUniversity(e.target.value)} className="w-full border rounded-lg p-3 outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Fakultet</label>
            <input aria-label="Fakultet" placeholder="Masalan: Kompyuter injiniringi" value={faculty} onChange={e => setFaculty(e.target.value)} className="w-full border rounded-lg p-3 outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="text-sm text-gray-600 mb-1 block">ORCID iD (ixtiyoriy)</label>
            <input
              aria-label="ORCID iD"
              placeholder="0000-0002-1825-0097"
              value={orcid}
              onChange={e => setOrcid(e.target.value)}
              className="w-full border rounded-lg p-3 outline-none focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Profilingizda ORCID&apos;dagi nashrlar ham ko&apos;rsatiladi
            </p>
          </div>
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Username (ixtiyoriy)</label>
            <input
              aria-label="Username"
              placeholder="masalan: oybek_mominov"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full border rounded-lg p-3 outline-none focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Kirishda email o&apos;rniga ishlatiladi</p>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button onClick={handleSave} disabled={saving} className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Saqlanmoqda...' : success ? 'Saqlandi!' : 'Saqlash'}
          </button>
          <div className="mt-6 pt-6 border-t">
            <h3 className="font-semibold text-gray-700 mb-4">Parolni almashtirish</h3>
            {passwordError && <p className="text-red-500 text-sm mb-3">{passwordError}</p>}
            {passwordSuccess && <p className="text-green-500 text-sm mb-3">✅ Parol muvaffaqiyatli yangilandi!</p>}
            <div className="relative mb-3">
              <input
                type={showNewPassword ? 'text' : 'password'}
                autoComplete="new-password"
                aria-label="Yangi parol"
                placeholder="Yangi parol (kamida 6 belgi)"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full border rounded-lg p-3 outline-none focus:border-blue-500 pr-12"
              />
              <button type="button" onClick={() => setShowNewPassword(!showNewPassword)}
                aria-label={showNewPassword ? 'Parolni yashirish' : "Parolni ko'rsatish"}
                className="absolute right-3 top-3 text-gray-500 hover:text-gray-600 text-lg">
                {showNewPassword ? '🙈' : '👁'}
              </button>
            </div>
            <button
              onClick={handlePasswordChange}
              className="w-full bg-gray-800 text-white py-3 rounded-lg font-medium hover:bg-gray-900"
            >
              Parolni yangilash
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
