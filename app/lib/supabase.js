import { createClient } from '@supabase/supabase-js'
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
export const supabase = createClient(supabaseUrl, supabaseKey)

const isInvalidRefreshTokenError = (error) => {
  const message = error?.message || ''
  return message.includes('Invalid Refresh Token') || message.includes('Refresh Token Not Found')
}

const clearStoredAuthTokens = async () => {
  try {
    await supabase.auth.signOut({ scope: 'local' })
  } catch {}

  if (typeof window === 'undefined') return

  Object.keys(window.localStorage)
    .filter(key => key.startsWith('sb-') && key.endsWith('-auth-token'))
    .forEach(key => window.localStorage.removeItem(key))
}

export const getCurrentUser = async () => {
  try {
    const { data, error } = await supabase.auth.getUser()

    if (error) {
      if (isInvalidRefreshTokenError(error)) {
        await clearStoredAuthTokens()
      }
      return null
    }

    return data.user
  } catch (error) {
    if (isInvalidRefreshTokenError(error)) {
      await clearStoredAuthTokens()
    }
    return null
  }
}
