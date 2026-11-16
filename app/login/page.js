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
  const [isResetMode, setIsResetMode] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const clearMessages = () => {
    setError('')
    setMessage('')
  }

  const getEmailForLogin = async (value) => {
    const loginValue = value.trim()

    if (!loginValue) return null
    if (loginValue.includes('@')) return loginValue

    const { data } = await supabase.rpc('email_for_username', { uname: loginValue.toLowerCase() })
    return data || null
  }

  const handlePasswordReset = async () => {
    setLoading(true)
    clearMessages()

    const loginEmail = await getEmailForLogin(email)
    if (!loginEmail) {
      setError("Email yoki username topilmadi!")
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.resetPasswordForEmail(loginEmail, {
      redirectTo: `${window.location.origin}/reset-password`
    })

    if (error) setError(error.message)
    else setMessage("Parolni tiklash havolasi emailingizga yuborildi. Spam papkasini ham tekshiring.")
    setLoading(false)
  }

  const handleSubmit = async () => {
    setLoading(true)
    clearMessages()

    if (isResetMode) {
      await handlePasswordReset()
      return
    }

    if (isRegister) {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: `${window.location.origin}/login` },
      })
      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      if (!data.session) {
        setMessage("Ro'yxatdan o'tdingiz. Emailingizga yuborilgan tasdiqlash havolasini bosib, keyin kiring.")
        setIsRegister(false)
        setLoading(false)
        return
      }

      router.push('/dashboard')
    } else {
      const loginEmail = await getEmailForLogin(email)
      if (!loginEmail) {
        setError('Email yoki username topilmadi!')
        setLoading(false)
        return
      }

      const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password })
      if (error) setError('Email/username yoki parol xato!')
      else router.push('/dashboard')
    }
    setLoading(false)
  }

  const switchAuthMode = () => {
    setIsRegister(!isRegister)
    setIsResetMode(false)
    clearMessages()
  }

  const switchResetMode = (enabled) => {
    setIsResetMode(enabled)
    setIsRegister(false)
    clearMessages()
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white shadow-sm px-6 py-4">
        <Link href="/" className="text-xl font-bold text-blue-600">Bosh sahifa</Link>
      </header>
      <div className="flex flex-1 items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
          <h1 className="text-2xl font-bold text-center mb-6">
            {isResetMode ? 'Parolni tiklash' : isRegister ? "Ro'yxatdan o'tish" : 'Kirish'}
          </h1>
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          {message && <p className="text-green-600 text-sm mb-4">{message}</p>}
          <input
            type="text"
            inputMode="email"
            autoComplete="username"
            aria-label="Email yoki username"
            placeholder="Email yoki username"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
            className="w-full border rounded-lg p-3 mb-3 outline-none focus:border-blue-500"
          />
          {!isResetMode && (
            <div className="relative mb-4">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                aria-label="Parol"
                placeholder="Parol"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
                className="w-full border rounded-lg p-3 outline-none focus:border-blue-500 pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Parolni yashirish' : "Parolni ko'rsatish"}
                className="absolute right-3 top-3 text-gray-500 hover:text-gray-600 text-lg"
              >
                {showPassword ? '🙈' : '👁'}
              </button>
            </div>
          )}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Yuklanmoqda...' : isResetMode ? 'Tiklash havolasini yuborish' : isRegister ? "Ro'yxatdan o'tish" : 'Kirish'}
          </button>
          {!isRegister && !isResetMode && (
            <button
              type="button"
              onClick={() => switchResetMode(true)}
              className="w-full text-center mt-3 text-sm text-blue-600 font-medium"
            >
              Parolni unutdingizmi?
            </button>
          )}
          {isResetMode ? (
            <p className="text-center mt-4 text-sm text-gray-600">
              Parol esingizdami?{' '}
              <button onClick={() => switchResetMode(false)} className="text-blue-600 font-medium">
                Kirish
              </button>
            </p>
          ) : (
            <p className="text-center mt-4 text-sm text-gray-600">
              {isRegister ? 'Hisobingiz bormi? ' : "Hisobingiz yo'qmi? "}
              <button onClick={switchAuthMode} className="text-blue-600 font-medium">
                {isRegister ? 'Kirish' : "Ro'yxatdan o'tish"}
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
