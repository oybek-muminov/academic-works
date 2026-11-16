-- Academic Works — DOI va ORCID qo'shimchalari.
-- Supabase Dashboard → SQL Editor da bir marta ishga tushiring.
-- Idempotent: qayta ishga tushirish xavfsiz.

alter table public.works add column if not exists doi text;
alter table public.works add column if not exists journal text;
alter table public.profiles add column if not exists orcid text;

comment on column public.works.doi is 'Crossref DOI, normallashtirilgan: 10.xxxx/...';
comment on column public.works.journal is 'Jurnal yoki nashriyot nomi (Crossref dan)';
comment on column public.profiles.orcid is 'ORCID iD: 0000-0000-0000-0000';

-- DOI bo'yicha saytdagi ishlarni tez topish uchun.
create index if not exists works_doi_idx on public.works (lower(doi));
