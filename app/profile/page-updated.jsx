'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [fullName, setFullName] = useState('')
  const [university, setUniversity] = useState('')
  const [faculty, setFaculty] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [username, setUsername] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [passwordError, setPasswordError] = useState('')

  useEffect(() => {
    const getProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) { setFullName(data.full_name || ''); setUniversity(data.university || ''); setFaculty(data.faculty || ''); setUsername(data.username || '') }
      setLoading(false)
    }
    getProfile()
  }, [router])

  const handleSave = async () => {
    setSaving(true)
    await supabase.from('profiles').upsert({ id: user.id, full_name: fullName, university, faculty, username: username ? username.toLowerCase().trim() : null, login_email: user.email })
    setSaving(false)
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
      setCurrentPassword('')
      setNewPassword('')
      setTimeout(() => setPasswordSuccess(false), 3000)
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Yuklanmoqda...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <button onClick={() => router.push('/dashboard')} className="text-sm text-blue-600 hover:underline">Dashboard</button>
      </header>
      <div className="max-w-lg mx-auto p-6">
        <h2 className="text-lg font-semibold mb-6">Profil sozlamalari</h2>
        <div className="bg-white rounded-xl shadow p-6 space-y-4">
          <div>
            <label className="text-sm text-gray-600 mb-1 block">To&apos;liq ism *</label>
            <input placeholder="Ism Familiya" value={fullName} onChange={e => setFullName(e.target.value)} className="w-full border rounded-lg p-3 outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Universitet</label>
            <input placeholder="Masalan: TATU, NUUz..." value={university} onChange={e => setUniversity(e.target.value)} className="w-full border rounded-lg p-3 outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Fakultet</label>
            <input placeholder="Masalan: Kompyuter injiniringi" value={faculty} onChange={e => setFaculty(e.target.value)} className="w-full border rounded-lg p-3 outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Username (ixtiyoriy)</label>
            <input
              placeholder="masalan: oybek_mominov"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full border rounded-lg p-3 outline-none focus:border-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">Kirishda email o'rniga ishlatiladi</p>
          </div>
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
                placeholder="Yangi parol (kamida 6 belgi)"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full border rounded-lg p-3 outline-none focus:border-blue-500 pr-12"
              />
              <button type="button" onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 text-lg">
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
