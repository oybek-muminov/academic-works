import test from 'node:test'
import assert from 'node:assert/strict'
import { elements } from '../app/data/elements.js'
import { CATEGORIES, dedupeWorks, doiApiPath, doiUrl, isValidDoi, matchesWork, normalizeDoi, visibleCategory } from '../app/lib/works.js'
import { findSiteMatch, isValidOrcid, matchesSiteWork, normalizeOrcid, normalizeTitle, orcidUrl, categoryFromOrcidType, matchesOrcidWork, authorsFromWorkDetail } from '../app/lib/orcid.js'
import { storagePath } from '../app/lib/filePath.js'

test('elements: 118 ta va raqamlar takrorlanmaydi', () => {
  assert.equal(elements.length, 118)
  assert.equal(new Set(elements.map(el => el.n)).size, 118)
  assert.deepEqual(
    elements.map(el => el.n).sort((a, b) => a - b),
    Array.from({ length: 118 }, (_, i) => i + 1)
  )
})

test('La va Ac asosiy jadval katagida joylashgan', () => {
  for (const n of [57, 89]) {
    const el = elements.find(item => item.n === n)
    assert.ok(el, `element ${n} topilmadi`)
    assert.equal(typeof el.period, 'number')
    assert.equal(el.group, 3)
  }
})

test('f-blok 14 lantanoid va 14 aktinoiddan iborat', () => {
  assert.equal(elements.filter(el => el.period === 'La').length, 14)
  assert.equal(elements.filter(el => el.period === 'Ac').length, 14)
})

test('visibleCategory barcha kategoriyalarni qaytaradi', () => {
  assert.equal(CATEGORIES.length, 7)
  assert.equal(visibleCategory(1), 'Maqola')
  assert.equal(visibleCategory(6), 'Boshqa')
  assert.equal(visibleCategory(0), '')
  assert.equal(visibleCategory(99), '')
})

test('matchesWork qidiruv va kategoriyani birlashtiradi', () => {
  const work = { title: 'Sun’iy intellekt', authors: 'Ali Valiyev', category_id: 1 }
  assert.equal(matchesWork(work), true)
  assert.equal(matchesWork(work, { search: 'intellekt' }), true)
  assert.equal(matchesWork(work, { search: 'valiyev' }), true)
  assert.equal(matchesWork(work, { search: 'fizika' }), false)
  assert.equal(matchesWork(work, { category: 1 }), true)
  assert.equal(matchesWork(work, { category: 2 }), false)

  const rich = { ...work, journal: 'Nuclear Materials', doi: '10.1016/j.nimb.2025.1', year: 2025 }
  assert.equal(matchesWork(rich, { search: 'nuclear' }), true)
  assert.equal(matchesWork(rich, { search: '10.1016' }), true)
  assert.equal(matchesWork(rich, { search: '2025' }), true)
})

test('dedupeWorks faqat bir foydalanuvchining dublikatini yashiradi', () => {
  const base = { title: 'Maqola', authors: 'Muallif', category_id: 1 }
  const sameUser = dedupeWorks([
    { ...base, id: '1', user_id: 'u1' },
    { ...base, id: '2', user_id: 'u1' },
  ])
  assert.equal(sameUser.length, 1)

  const differentUsers = dedupeWorks([
    { ...base, id: '1', user_id: 'u1' },
    { ...base, id: '2', user_id: 'u2' },
  ])
  assert.equal(differentUsers.length, 2)
})

test('storagePath Supabase public URL dan fayl yo‘lini ajratadi', () => {
  assert.equal(
    storagePath('https://project.supabase.co/storage/v1/object/public/works-files/user-1/123.pdf'),
    'user-1/123.pdf'
  )
  assert.equal(storagePath('https://project.supabase.co/storage/v1/object/public/works-files/avatars/u1.png?x=1'), 'avatars/u1.png')
  assert.equal(storagePath('https://example.com/file.pdf'), null)
  assert.equal(storagePath(null), null)
})

test('normalizeDoi havola va prefikslarni tozalaydi', () => {
  assert.equal(normalizeDoi('10.1038/NATURE12373'), '10.1038/nature12373')
  assert.equal(normalizeDoi('  https://doi.org/10.1038/nature12373  '), '10.1038/nature12373')
  assert.equal(normalizeDoi('http://dx.doi.org/10.1038/nature12373'), '10.1038/nature12373')
  assert.equal(normalizeDoi('doi: 10.1038/nature12373'), '10.1038/nature12373')
  assert.equal(normalizeDoi('/10.1038/nature12373'), '10.1038/nature12373')
  assert.equal(normalizeDoi(''), '')
  assert.equal(normalizeDoi(null), '')
})

test('isValidDoi faqat 10.xxxx/... ko‘rinishini qabul qiladi', () => {
  assert.equal(isValidDoi('10.1038/nature12373'), true)
  assert.equal(isValidDoi('https://doi.org/10.1000/xyz'), true)
  assert.equal(isValidDoi('10.1038'), false)
  assert.equal(isValidDoi('nature12373'), false)
  assert.equal(isValidDoi('11.1038/nature12373'), false)
  assert.equal(isValidDoi(''), false)
})

test('doiUrl va doiApiPath xavfsiz havola quradi', () => {
  assert.equal(doiUrl('10.1038/nature12373'), 'https://doi.org/10.1038/nature12373')
  assert.equal(doiUrl('10.1000/a#b'), 'https://doi.org/10.1000/a%23b')
  assert.equal(doiUrl('10.1000/a?b'), 'https://doi.org/10.1000/a%3Fb')
  assert.equal(doiUrl('not-a-doi'), null)
  assert.equal(doiApiPath('10.1000/a b#c'), '10.1000/ab%23c')
  assert.equal(doiApiPath('not-a-doi'), null)
})

test('normalizeOrcid turli ko‘rinishlarni birlashtiradi', () => {
  assert.equal(normalizeOrcid('0000-0002-1825-0097'), '0000-0002-1825-0097')
  assert.equal(normalizeOrcid('0000000218250097'), '0000-0002-1825-0097')
  assert.equal(normalizeOrcid('https://orcid.org/0000-0002-1825-0097'), '0000-0002-1825-0097')
  assert.equal(normalizeOrcid('0000-0002-1825'), '')
  assert.equal(normalizeOrcid(''), '')
})

test('isValidOrcid tekshiruv raqamini hisobga oladi', () => {
  assert.equal(isValidOrcid('0000-0002-1825-0097'), true)
  assert.equal(isValidOrcid('0000-0001-5109-3700'), true)
  assert.equal(isValidOrcid('0000-0002-1825-0098'), false)
  assert.equal(isValidOrcid('0000-0002-1825-009X'), false)
  assert.equal(orcidUrl('0000-0002-1825-0097'), 'https://orcid.org/0000-0002-1825-0097')
  assert.equal(orcidUrl('0000-0002-1825-0098'), null)
})

test('normalizeTitle tinish belgilari va registrni tashlab yuboradi', () => {
  assert.equal(normalizeTitle('Sun’iy  Intellekt: Yangi davr!'), 'sun iy intellekt yangi davr')
  assert.equal(normalizeTitle('Café — Étude'), 'cafe etude')
  assert.equal(normalizeTitle(null), '')
})

test('matchesSiteWork DOI yoki sarlavha bo‘yicha mos keladi', () => {
  const orcidWork = { doi: '10.1038/NATURE12373', title: 'A very important scientific paper' }

  assert.equal(
    matchesSiteWork(orcidWork, { doi: 'https://doi.org/10.1038/nature12373', title: 'Boshqa nom' }),
    true
  )
  assert.equal(
    matchesSiteWork({ doi: '', title: 'A very important scientific paper' }, { title: 'a very important scientific paper' }),
    true
  )
  assert.equal(matchesSiteWork(orcidWork, { doi: '10.1000/other', title: 'Boshqa nom' }), false)

  const site = [{ id: 'w1', doi: '10.1038/nature12373', title: 'X' }, { id: 'w2', doi: '', title: 'Boshqa' }]
  assert.equal(findSiteMatch(orcidWork, site)?.id, 'w1')
  assert.equal(findSiteMatch({ doi: '', title: 'Topilmadi' }, site), null)
})

test('categoryFromOrcidType ORCID turini sayt kategoriyasiga moslashtiradi', () => {
  assert.equal(categoryFromOrcidType('journal-article'), 1)
  assert.equal(categoryFromOrcidType('conference-paper'), 2)
  assert.equal(categoryFromOrcidType('book-chapter'), 3)
  assert.equal(categoryFromOrcidType('dissertation'), 6)
  assert.equal(categoryFromOrcidType(null), 6)
})

test('matchesOrcidWork sarlavha, jurnal, DOI va yil bo‘yicha qidiradi', () => {
  const work = {
    title: 'SRIM simulation of irradiation damage by protons',
    journal: 'Nuclear Materials',
    doi: '10.1016/j.nimb.2025.1',
    year: '2025',
    type: 'journal-article',
  }
  assert.equal(matchesOrcidWork(work), true)
  assert.equal(matchesOrcidWork(work, { search: 'srim' }), true)
  assert.equal(matchesOrcidWork(work, { search: 'nuclear' }), true)
  assert.equal(matchesOrcidWork(work, { search: '10.1016' }), true)
  assert.equal(matchesOrcidWork(work, { search: '2025' }), true)
  assert.equal(matchesOrcidWork(work, { search: 'fizika' }), false)
})

test('authorsFromWorkDetail mualliflarni takrorlanmasdan yig‘adi', () => {
  const detail = {
    contributors: {
      contributor: [
        { 'credit-name': { value: 'Ali Valiyev' } },
        { 'credit-name': { value: 'Ali Valiyev' } },
        { 'credit-name': { value: '   ' } },
        { 'credit-name': null },
        { 'credit-name': { value: 'Oybek Mominov' } },
      ],
    },
  }
  assert.equal(authorsFromWorkDetail(detail), 'Ali Valiyev, Oybek Mominov')
  assert.equal(authorsFromWorkDetail({}), '')
  assert.equal(authorsFromWorkDetail(null), '')
})
