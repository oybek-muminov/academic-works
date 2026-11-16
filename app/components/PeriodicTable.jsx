'use client'
import { useState } from 'react'
import { elements } from '../data/elements'

const catColors = {
  1: 'bg-blue-200 text-blue-900',
  2: 'bg-green-200 text-green-900',
  3: 'bg-yellow-200 text-yellow-900',
  4: 'bg-pink-200 text-pink-900',
  5: 'bg-lime-200 text-lime-900',
  6: 'bg-orange-200 text-orange-900',
  7: 'bg-purple-200 text-purple-900',
  8: 'bg-gray-200 text-gray-900',
  9: 'bg-red-200 text-red-900',
}

const catNames = {
  1: "Ishqoriy metallar",
  2: "Ishqoriy-yer metallar",
  3: "O'tish metallar",
  4: "Lantanoid/Aktinoid",
  5: "Nometalllar",
  6: "Metalloidlar",
  7: "Inert gazlar",
  8: "Boshqa metallar",
  9: "Galogenlar",
}

const ElBox = ({ el, selected, onSelect }) => (
  <button
    type="button"
    onClick={() => onSelect(el)}
    aria-pressed={selected?.n === el.n}
    aria-label={`${el.name} (${el.sym}), tartib raqami ${el.n}`}
    className={`relative z-10 flex cursor-pointer flex-col items-center justify-center rounded border border-transparent px-0.5 py-1 transition hover:z-20 hover:scale-110 hover:border-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${catColors[el.cat]} ${selected?.n === el.n ? 'scale-110 ring-2 ring-blue-600' : ''}`}
  >
    <span className="text-[9px] leading-none opacity-70">{el.n}</span>
    <span className="text-sm font-semibold leading-tight">{el.sym}</span>
    <span className="max-w-full truncate text-[9px] leading-none opacity-70">
      {el.name}
    </span>
  </button>
)

const Empty = () => <span aria-hidden="true" />

export default function PeriodicTable({ defaultOpen = false }) {
  const [selected, setSelected] = useState(null)
  const [isOpen, setIsOpen] = useState(defaultOpen)

  const mainElements = elements.filter(e => e.period !== 'La' && e.period !== 'Ac')
  const laElements = elements.filter(e => e.period === 'La')
  const acElements = elements.filter(e => e.period === 'Ac')

  const cellMap = {}
  mainElements.forEach(el => {
    cellMap[`${el.period}-${el.group}`] = el
  })

  return (
    <div className="bg-white rounded-xl shadow p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Kimyoviy elementlar davriy jadvali</h2>
          <p className="text-xs text-gray-500 mt-0.5">Element ustiga bosing â€” ma&apos;lumot pastda chiqadi</p>
        </div>
        {!defaultOpen && (
          <button
            type="button"
            onClick={() => setIsOpen(prev => !prev)}
            aria-expanded={isOpen}
            className="px-3 py-2 rounded-lg text-sm font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 transition-colors"
          >
            {isOpen ? 'Yopish' : 'Ochish'}
          </button>
        )}
      </div>

      {isOpen && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-x-3 gap-y-1 sm:flex sm:flex-wrap sm:gap-2">
            {Object.entries(catNames).map(([k, v]) => (
              <div key={k} className="flex items-center gap-1.5">
                <span className={`h-3 w-3 flex-shrink-0 rounded ${catColors[k].split(' ')[0]}`} />
                <span className="text-xs text-gray-500">{v}</span>
              </div>
            ))}
          </div>

          <div className="-mx-1 overflow-x-auto px-1 pb-2">
            <div
              className="grid gap-0.5"
              style={{ gridTemplateColumns: 'repeat(18, minmax(38px, 1fr))', minWidth: '760px' }}
            >
              {Array.from({ length: 7 }, (_, r) =>
                Array.from({ length: 18 }, (_, c) => {
                  const row = r + 1
                  const col = c + 1
                  const el = cellMap[`${row}-${col}`]
                  if (el) return <ElBox key={el.n} el={el} selected={selected} onSelect={setSelected} />
                  return <Empty key={`${r}-${c}`} />
                })
              )}
            </div>

            {/* Lantanoidlar */}
            <div
              className="mt-2 grid gap-0.5"
              style={{ gridTemplateColumns: 'repeat(18, minmax(38px, 1fr))', minWidth: '760px' }}
            >
              <div className="flex items-center justify-end pr-1 text-[10px] text-gray-500" style={{ gridColumn: '1 / 3' }}>La*</div>
              {laElements.map(el => <ElBox key={el.n} el={el} selected={selected} onSelect={setSelected} />)}
              <Empty />
            </div>

            {/* Aktinoidlar */}
            <div
              className="mt-1 grid gap-0.5"
              style={{ gridTemplateColumns: 'repeat(18, minmax(38px, 1fr))', minWidth: '760px' }}
            >
              <div className="flex items-center justify-end pr-1 text-[10px] text-gray-500" style={{ gridColumn: '1 / 3' }}>Ac*</div>
              {acElements.map(el => <ElBox key={el.n} el={el} selected={selected} onSelect={setSelected} />)}
            </div>
          </div>

          {selected ? (
            <div className="mt-5 flex flex-wrap gap-4 rounded-xl border bg-gray-50 p-4">
              <div className="flex-shrink-0">
                <div className={`flex h-16 w-16 items-center justify-center rounded-xl text-3xl font-bold ${catColors[selected.cat]}`}>
                  {selected.sym}
                </div>
                <div className="mt-1 text-center text-[10px] text-gray-500">{catNames[selected.cat]}</div>
              </div>
              <div className="min-w-48 flex-1">
                <h3 className="text-lg font-bold text-gray-800">{selected.name}</h3>
                <p className="mb-2 text-sm text-gray-500">
                  Tartib raqami: {selected.n} Â· Atom massasi: {selected.mass}
                </p>
                <div className="mb-2 grid grid-cols-2 gap-2 text-sm">
                  <div><span className="block text-[11px] text-gray-500">Elektron konfiguratsiya</span>{selected.conf}</div>
                  <div><span className="block text-[11px] text-gray-500">Agregat holat</span>{selected.phase}</div>
                  <div><span className="block text-[11px] text-gray-500">Kashf etilgan</span>{selected.disc}</div>
                  <div><span className="block text-[11px] text-gray-500">Guruh / Davr</span>{selected.group || 'â€”'} / {typeof selected.period === 'number' ? selected.period : 'f-blok'}</div>
                </div>
                <p className="border-t pt-2 text-sm text-gray-600">{selected.uz}</p>
              </div>
            </div>
          ) : (
            <p className="mt-4 rounded-xl border border-dashed bg-gray-50 p-3 text-center text-sm text-gray-500">
              Element tanlanmagan
            </p>
          )}
        </>
      )}
    </div>
  )
}

