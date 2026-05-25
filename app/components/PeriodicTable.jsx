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

export default function PeriodicTable() {
  const [selected, setSelected] = useState(null)

  const mainElements = elements.filter(e => e.period !== 'La' && e.period !== 'Ac')
  const laElements = elements.filter(e => e.period === 'La')
  const acElements = elements.filter(e => e.period === 'Ac')

  const cellMap = {}
  mainElements.forEach(el => {
    cellMap[`${el.period}-${el.group}`] = el
  })

  const ElBox = ({ el }) => (
    <div
      onClick={() => setSelected(el)}
      className={`cursor-pointer rounded p-0.5 text-center border border-transparent hover:border-gray-400 hover:scale-110 transition-transform relative z-10 ${catColors[el.cat]} ${selected?.n === el.n ? 'ring-2 ring-blue-500 scale-110' : ''}`}
      style={{ minHeight: '36px' }}
    >
      <div style={{ fontSize: '7px', opacity: 0.7 }}>{el.n}</div>
      <div style={{ fontSize: '12px', fontWeight: 600 }}>{el.sym}</div>
      <div style={{ fontSize: '6px', opacity: 0.7, overflow: 'hidden', whiteSpace: 'nowrap' }}>
        {el.name.length > 7 ? el.name.slice(0, 6) + '..' : el.name}
      </div>
    </div>
  )

  const Empty = () => <div style={{ minHeight: '36px' }} />

  return (
    <div className="bg-white rounded-xl shadow p-4 mb-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-3">Kimyoviy elementlar davriy jadvali</h2>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 mb-3">
        {Object.entries(catNames).map(([k, v]) => (
          <div key={k} className="flex items-center gap-1">
            <div className={`w-3 h-3 rounded ${catColors[k].split(' ')[0]}`} />
            <span className="text-xs text-gray-500">{v}</span>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="overflow-x-auto">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(18, minmax(32px, 1fr))', gap: '2px', minWidth: '600px' }}>
          {Array.from({ length: 7 }, (_, r) =>
            Array.from({ length: 18 }, (_, c) => {
              const row = r + 1
              const col = c + 1
              const el = cellMap[`${row}-${col}`]
              if (row === 6 && col === 3) return <div key={`${r}-${c}`} className="bg-pink-50 rounded text-center" style={{ minHeight: '36px', fontSize: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#be185d' }}>La*</div>
              if (row === 7 && col === 3) return <div key={`${r}-${c}`} className="bg-pink-50 rounded text-center" style={{ minHeight: '36px', fontSize: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#be185d' }}>Ac*</div>
              if (el) return <ElBox key={el.n} el={el} />
              return <Empty key={`${r}-${c}`} />
            })
          )}
        </div>

        {/* Lanthanides */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(18, minmax(32px, 1fr))', gap: '2px', marginTop: '4px', minWidth: '600px' }}>
          <div style={{ gridColumn: '1/3', minHeight: '36px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '4px', fontSize: '8px', color: '#6b7280' }}>La*</div>
          {laElements.map(el => <ElBox key={el.n} el={el} />)}
          <div style={{ minHeight: '36px' }} />
        </div>

        {/* Actinides */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(18, minmax(32px, 1fr))', gap: '2px', marginTop: '2px', minWidth: '600px' }}>
          <div style={{ gridColumn: '1/3', minHeight: '36px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '4px', fontSize: '8px', color: '#6b7280' }}>Ac*</div>
          {acElements.map(el => <ElBox key={el.n} el={el} />)}
        </div>
      </div>

      {/* Info panel */}
      {selected && (
        <div className="mt-4 border rounded-xl p-4 flex gap-4 flex-wrap bg-gray-50">
          <div>
            <div className={`w-16 h-16 rounded-xl flex items-center justify-center text-3xl font-bold ${catColors[selected.cat]}`}>
              {selected.sym}
            </div>
            <div className="text-xs text-gray-400 text-center mt-1">{catNames[selected.cat]}</div>
          </div>
          <div className="flex-1 min-w-48">
            <h3 className="font-bold text-lg text-gray-800">{selected.name}</h3>
            <p className="text-sm text-gray-500 mb-2">Tartib raqami: {selected.n} | Atom massasi: {selected.mass}</p>
            <div className="grid grid-cols-2 gap-2 text-sm mb-2">
              <div><span className="text-gray-400 text-xs block">Elektron konfiguratsiya</span>{selected.conf}</div>
              <div><span className="text-gray-400 text-xs block">Agregat holat</span>{selected.phase}</div>
              <div><span className="text-gray-400 text-xs block">Kashf etilgan</span>{selected.disc}</div>
              <div><span className="text-gray-400 text-xs block">Guruh / Davr</span>{selected.group || '—'} / {selected.period}</div>
            </div>
            <p className="text-sm text-gray-600 border-t pt-2">{selected.uz}</p>
          </div>
        </div>
      )}
    </div>
  )
}
