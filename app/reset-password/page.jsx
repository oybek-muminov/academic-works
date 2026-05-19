'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ResetPassword() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleReset = async () => {
    if (password.length < 6) { setError("Parol kamida 6 ta belgidan iborat bo'lsin"); return }
    if (password !== confirm) { setError("Parollar mos kelmayapti"); return }
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) setError(error.message)
    else setSuccess(true)
    setLoading(false)
  }

  if (success) return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white shadow-sm px-6 py-4">
        <Link href="/" className="text-xl font-bold text-blue-600">← Bosh sahifa</Link>
      </header>
      <div className="flex flex-1 items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md text-center">
          <p className="text-4xl mb-3">✅</p>
          <h2 className="text-xl font-bold mb-2">Parol yangilandi!</h2>
          <button onClick={() => router.push('/dashboard')}
            className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
            Dashboardga o'tish
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white shadow-sm px-6 py-4">
        <Link href="/" className="text-xl font-bold text-blue-600">← Bosh sahifa</Link>
      </header>
      <div className="flex flex-1 items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
          <h1 className="text-2xl font-bold text-center mb-6">Yangi parol o'rnatish</h1>
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          <input
            type="password"
            placeholder="Yangi parol (kamida 6 belgi)"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full border rounded-lg p-3 mb-3 outline-none focus:border-blue-500"
          />
          <input
            type="password"
            placeholder="Parolni tasdiqlang"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            className="w-full border rounded-lg p-3 mb-4 outline-none focus:border-blue-500"
          />
          <button onClick={handleReset} disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Saqlanmoqda...' : 'Parolni yangilash'}
          </button>
        </div>
      </div>
    </div>
  )
}