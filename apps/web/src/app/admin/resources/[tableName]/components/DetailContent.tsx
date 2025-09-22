'use client'
import React from 'react'
import { ChevronDown, ChevronUp, Info, Database, List, FileText } from 'lucide-react'
import type { Row } from '../types'

/* Type guards sin `any` */
const isPrimitive = (v: unknown): v is string | number | boolean | null =>
  v === null || ['string', 'number', 'boolean'].includes(typeof v)

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const isArrayOfObjects = (v: unknown): v is Array<Record<string, unknown>> =>
  Array.isArray(v) && v.length > 0 && v.every(isPlainObject)

const isArrayOfPrimitives = (v: unknown): v is Array<string | number | boolean | null> =>
  Array.isArray(v) && v.every(isPrimitive)

export function DetailContent({ row }: { row: Row }) {
  const [open, setOpen] = React.useState<Record<string, boolean>>({})
  const entries = Object.entries(row as Record<string, unknown>)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-200/50 shadow-sm">
      {/* Campos primitivos */}
      {entries
        .filter(([, v]) => isPrimitive(v))
        .map(([k, v]) => (
          <div key={k} className="flex items-start gap-4 p-4 bg-white rounded-xl border border-gray-200/50 hover:border-gray-300/50 transition-all duration-200 shadow-sm hover:shadow-md">
            <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
              <Info className="h-4 w-4 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="block font-semibold text-gray-900 text-sm mb-1 capitalize">
                {k.replace(/_/g, ' ')}
              </span>
              <span className="text-gray-700 font-medium break-words">{String(v)}</span>
            </div>
          </div>
        ))}

      {/* Campos complejos */}
      {entries
        .filter(([, v]) => !isPrimitive(v))
        .map(([k, v]) => (
          <div key={k} className="md:col-span-2 bg-white rounded-2xl border border-gray-200/50 shadow-sm hover:shadow-md transition-all duration-200">
            <button
              onClick={() => setOpen(s => ({ ...s, [k]: !s[k] }))}
              className="w-full flex justify-between items-center text-left p-6 hover:bg-gray-50/50 rounded-2xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Database className="h-5 w-5 text-purple-600" />
                </div>
                <span className="font-semibold text-gray-900 capitalize">{k.replace(/_/g, ' ')}</span>
              </div>
              {open[k] ? (
                <ChevronUp className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-500" />
              )}
            </button>

            {open[k] && (
              <div className="px-6 pb-6 text-gray-800 text-sm space-y-4">
                {/* Array de objetos → tabla */}
                {isArrayOfObjects(v) && (
                  <div className="overflow-hidden rounded-xl border border-gray-200">
                    <table className="w-full text-sm">
                      <thead className="bg-gradient-to-r from-blue-50 to-blue-100">
                        <tr>
                          {Object.keys(v[0]).map(c => (
                            <th
                              key={c}
                              className="px-4 py-3 text-left text-blue-700 font-semibold border-b border-blue-200"
                            >
                              {c}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {v.map((r, i) => (
                          <tr
                            key={i}
                            className={i % 2 === 0 ? 'bg-white hover:bg-gray-50/50' : 'bg-gray-50/50 hover:bg-gray-100/50'}
                          >
                            {Object.keys(v[0]).map(c => (
                              <td key={c} className="px-4 py-3 border-b border-gray-200/50 font-medium">
                                {String((r as Record<string, unknown>)[c])}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Array de primitivos → lista */}
                {isArrayOfPrimitives(v) && (
                  <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-200/50">
                    <div className="flex items-center gap-2 mb-3">
                      <List className="h-4 w-4 text-gray-600" />
                      <span className="font-medium text-gray-700">Lista de elementos</span>
                    </div>
                    <ul className="space-y-2">
                      {v.map((it, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-gray-700">
                          <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                          <span className="font-medium">{String(it)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Objeto plano → definición */}
                {isPlainObject(v) && (
                  <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-200/50">
                    <div className="flex items-center gap-2 mb-4">
                      <FileText className="h-4 w-4 text-gray-600" />
                      <span className="font-medium text-gray-700">Propiedades del objeto</span>
                    </div>
                    <dl className="space-y-3">
                      {Object.entries(v).map(([prop, val]) => (
                        <div key={prop} className="flex items-start gap-4 p-3 bg-white rounded-lg border border-gray-200/50">
                          <dt className="font-semibold text-gray-900 min-w-0 flex-shrink-0 capitalize">
                            {prop.replace(/_/g, ' ')}:
                          </dt>
                          <dd className="flex-1 text-gray-700 font-medium break-words">{String(val)}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
    </div>
  )
}
