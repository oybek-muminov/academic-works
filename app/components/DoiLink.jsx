import { doiUrl, normalizeDoi } from '../lib/works'

// DOI uchun kichik havola. Ichki onClick ham ishlashi uchun stopPropagation
// bilan kartochka bosilishini to'xtatib turadi.
export default function DoiLink({ doi, className = '', stopPropagation = false }) {
  const url = doiUrl(doi)
  if (!url) return null

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title="DOI orqali asl nashrga o'tish"
      onClick={stopPropagation ? e => e.stopPropagation() : undefined}
      className={`inline-flex max-w-full items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 ${className}`}
    >
      <span className="font-semibold">DOI</span>
      <span className="truncate">{normalizeDoi(doi)}</span>
    </a>
  )
}
