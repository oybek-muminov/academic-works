import Link from 'next/link'
import PeriodicTable from '../components/PeriodicTable'

export const metadata = {
  title: 'Kimyoviy elementlar davriy jadvali',
  description: "118 ta kimyoviy element: tartib raqami, atom massasi, elektron konfiguratsiyasi va qisqa izohi.",
}

export default function PeriodicTablePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-600 shadow-sm px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <Link href="/" className="text-xl font-bold text-white hover:underline">
            Ilmiy ishlar bazasi
          </Link>
          <Link
            href="/"
            className="rounded-lg border border-white px-4 py-2 text-sm text-white transition hover:bg-blue-700"
          >
            ← Bosh sahifa
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl p-4 sm:p-6">
        <p className="mb-4 text-sm text-gray-600">
          Jadval alohida sahifaga chiqarildi. Ustiga bosing — element haqida ma&apos;lumot pastda ko&apos;rinadi.
          Telefonda jadvalni chapga-o&apos;ngga suring.
        </p>
        <PeriodicTable defaultOpen />
      </main>
    </div>
  )
}
