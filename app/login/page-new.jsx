'use client'
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isRegister, setIsRegister] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async () => {
    setLoading(true)
    setError('')

    if (isRegister) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else alert('Muvaffaqiyatli ro\'yxatdan o\'tdingiz!')
      router.push('/dashboard')
    } else {
      let loginEmail = email

      if (!email.includes('@')) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', email.toLowerCase().trim())
          .single()

        if (!profile) {
          setError("Username topilmadi!")
          setLoading(false)
          return
        }

        const { data: profileWithEmail } = await supabase
          .from('profiles')
          .select('login_email')
          .eq('username', email.toLowerCase().trim())
          .single()

        if (!profileWithEmail?.login_email) {
          setError("Bu username bilan email bog'lanmagan. Email bilan kiring.")
          setLoading(false)
          return
        }
        loginEmail = profileWithEmail.login_email
      }

      const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password })
      if (error) setError('Email/username yoki parol xato!')
      else router.push('/dashboard')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white shadow-sm px-6 py-4">
        <Link href="/" className="text-xl font-bold text-blue-600">Bosh sahifa</Link>
      </header>
      <div className="flex flex-1 items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
          <h1 className="text-2xl font-bold text-center mb-6">{isRegister ? "Ro'yxatdan o'tish" : "Kirish"}</h1>
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          <input type="email" placeholder="Email yoki username" value={email} onChange={e => setEmail(e.target.value)}
            className="w-full border rounded-lg p-3 mb-3 outline-none focus:border-blue-500" />
          <div className="relative mb-4">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Parol"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border rounded-lg p-3 outline-none focus:border-blue-500 pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 text-lg"
            >
              {showPassword ? '🙈' : '👁'}
            </button>
          </div>
          <button onClick={handleSubmit} disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Yuklanmoqda...' : isRegister ? "Ro'yxatdan o'tish" : 'Kirish'}
          </button>
          <p className="text-center mt-4 text-sm text-gray-600">
            {isRegister ? 'Hisobingiz bormi? ' : "Hisobingiz yo'qmi? "}
            <button onClick={() => setIsRegister(!isRegister)} className="text-blue-600 font-medium">
              {isRegister ? 'Kirish' : "Ro'yxatdan o'tish"}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
