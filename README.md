# Academic Works

Ilmiy ishlar (maqola, tezis, kitob, sertifikat, loyiha) bazasi. Next.js 16 + Supabase (Auth, Postgres, Storage).

## Imkoniyatlar

- Email yoki username bilan kirish, ro'yxatdan o'tish, parolni tiklash
- Ish yuklash, tahrirlash (ochiq/shaxsiy), o'chirish
- DOI kiritish: sarlavha, mualliflar va jurnal Crossref'dan avtomatik to'ladi
- ORCID iD: profilda ORCID'dagi nashrlar ro'yxati, saytda borligi belgisi bilan
- Bosh sahifa: qidiruv, kategoriya filtri, muallif profili
- Profil: ism, universitet, fakultet, username, ORCID, avatar, parol
- Kimyoviy elementlar davriy jadvali — alohida sahifa: `/davriy-jadval`

## 1. O'rnatish

```bash
npm install
cp .env.example .env.local
```

`.env.local` ga Supabase loyihasining qiymatlarini yozing
(Dashboard → Project Settings → API):

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 2. Supabase sozlash

1. `supabase/migrations/0001_init.sql` faylini Supabase Dashboard → SQL Editor da ishga tushiring.
   Skript jadvallar, RLS siyosatlari, `works-files` bucket va storage siyosatlarini yaratadi.
2. `supabase/migrations/0002_doi_orcid.sql` faylini ham ishga tushiring — u
   `works.doi`, `works.journal` va `profiles.orcid` ustunlarini qo'shadi.
3. Authentication → Providers → Email ni yoqing.
4. Authentication → URL Configuration:
   - Site URL: saytingiz manzili (`http://localhost:3000` lokal uchun)
   - Redirect URLs: `http://localhost:3000/**` va production domeningiz
5. Parolni tiklash emaili ishlashi uchun Email shablonlarini tekshiring.

DOI va ORCID ma'lumotlari tashqi API'lardan server tomonda olinadi
(`/api/doi/...` → Crossref, `/api/orcid/...` → pub.orcid.org), shuning uchun
qo'shimcha kalit yoki CORS sozlash kerak emas.

Skript `works-files` bucketni **private** qiladi. Fayllar ilovada imzolangan
(signed) havolalar orqali ochiladi. Mavjud fayllar o'chmaydi.

## 3. Ishga tushirish

```bash
npm run dev     # http://localhost:3000
```

## 4. Tekshiruvlar

```bash
npm test        # sof logika testlari (node:test)
npm run lint
npm run typecheck
npm run build
```

## Tuzilish

```
app/
  page.jsx                 bosh sahifa (qidiruv, filtr)
  davriy-jadval/           kimyoviy elementlar jadvali (alohida sahifa)
  api/doi/[...doi]/        Crossref proxy (sarlavha, mualliflar, jurnal)
  api/orcid/[orcid]/       ORCID nashrlari proxy
  login/                   kirish, ro'yxatdan o'tish, parolni tiklash
  reset-password/          yangi parol o'rnatish
  dashboard/               shaxsiy kabinet, fayl yuklash, DOI avtoto'ldirish
  profile/                 profil sozlamalari (ORCID bilan)
  user/[id]/               foydalanuvchi profili (saytdagi + ORCID ishlari)
  works/[id]/              ish tafsiloti
  components/PeriodicTable davriy jadval
  components/OrcidWorks    ORCID nashrlari ro'yxati
  components/DoiLink       DOI havolasi
  data/elements.js         118 element ma'lumoti
  lib/supabase.js          Supabase klienti
  lib/works.js             kategoriya, qidiruv, dedupe, DOI yordamchilari
  lib/orcid.js             ORCID normalizatsiya va moslashtirish
  lib/files.js             imzolangan URL hook
  lib/filePath.js          storage yo'lini ajratish
supabase/migrations/       DB sxemasi + RLS + storage siyosatlari
tests/                     node:test testlari
```

## Xavfsizlik

- RLS: `works` jadvalida faqat ochiq ishlar yoki o'z ishlari ko'rinadi.
- `profile_logins` jadvali hech kimga to'g'ridan-to'g'ri o'qilmaydi; username →
  email faqat `email_for_username` RPC orqali aniqlanadi.
- Storage private; fayl ochish uchun imzolangan havola kerak.
- Fayl hajmi klientda 20 MB bilan cheklangan. Production uchun bucket darajasida
  qo'shimcha limit qo'yish tavsiya etiladi.

## Eslatma

`npm run build` `.env.local` (yoki CI env) bo'lmasa `supabaseUrl is required`
xatosi bilan to'xtaydi — bu kutilgan holat.
