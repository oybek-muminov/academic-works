import HomeClient from './components/HomeClient'
import { dedupeWorks } from './lib/works'

// Bosh sahifa server'da render qilinadi va 60 soniya keshlanadi:
// foydalanuvchi ishlarni ko'rish uchun Supabase javobini kutmaydi.
export const revalidate = 60

// Faqat ko'rsatish uchun kerakli ustunlar — ortiqcha ma'lumot yuklanmaydi.
const PUBLIC_WORK_COLUMNS = [
  'id',
  'user_id',
  'title',
  'authors',
  'category_id',
  'journal',
  'doi',
  'file_url',
  'file_name',
  'created_at',
].join(',')

async function fetchPublicWorks() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return { works: [], failed: true }

  try {
    const response = await fetch(
      `${url}/rest/v1/works?select=${PUBLIC_WORK_COLUMNS}&is_public=eq.true&order=created_at.desc`,
      {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        next: { revalidate: 60, tags: ['public-works'] },
      }
    )

    if (!response.ok) return { works: [], failed: true }

    const data = await response.json()
    return { works: dedupeWorks(Array.isArray(data) ? data : []), failed: false }
  } catch {
    return { works: [], failed: true }
  }
}

export default async function Home() {
  const { works, failed } = await fetchPublicWorks()
  return <HomeClient works={works} initialError={failed} />
}
