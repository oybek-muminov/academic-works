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
  const [year, setYear] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const getProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (data) {
        setFullName(data.full_name || '')
        setUniversity(data.university || '')
        setFaculty(data.faculty || '')
        setYear(data.year || '')
      }
      setLoading(false)
    }
    getProfile()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    await supabase.from('profiles').upsert({
      id: user.id,
      full_name: fullName,
      university: university,
      faculty: faculty,
      year: year ? parseInt(year) : null,
    })
    setSaving(false)
    setSuccess(true)
    setTimeout(() => setSuccess(false), 2000)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Yuklanmoqda...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-blue-600">Academic Works</h1>
        <button onClick={() => router.push('/dashboard')} className="text-sm text-blue-600 hover:underline">
          ← Dashboard
        </button>
      </header>

      <div className="max-w-lg mx-auto p-6">
        <h2 className="text-lg font-semibold mb-6">Profil sozlamalari</h2>

        <div className="bg-white rounded-xl shadow p-6 space-y-4">
          <div>
            <label className="text-sm text-gray-600 mb-1 block">To'liq ism *</label>
            <input
              placeholder="Ism Familiya"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="w-full border rounded-lg p-3 outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Universitet</label>
            <input
              placeholder="Masalan: TATU, NUUz..."
              value={university}
              onChange={e => setUniversity(e.target.value)}
              className="w-full border rounded-lg p-3 outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Fakultet</label>
            <input
              placeholder="Masalan: Kompyuter injiniringi"
              value={faculty}
              onChange={e => setFaculty(e.target.value)}
              className="w-full border rounded-lg p-3 outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-sm text-gray-600 mb-1 block">O'quv yili</label>
            <select
              value={year}
              onChange={e => setYear(e.target.value)}
              className="w-full border rounded-lg p-3 outline-none focus:border-blue-500"
            >
              <option value="">Tanlang</option>
              <option value="1">1-kurs</option>
              <option value="2">2-kurs</option>
              <option value="3">3-kurs</option>
              <option value="4">4-kurs</option>
              <option value="5">5-kurs (magistr)</option>
            </select>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saqlanmoqda...' : success ? '✅ Saqlandi!' : 'Saqlash'}
          </button>
        </div>
      </div>
    </div>
  )
}