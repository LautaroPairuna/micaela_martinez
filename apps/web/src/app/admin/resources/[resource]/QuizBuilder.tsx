'use client';

import { useState, useCallback } from 'react';
import { Plus, Trash2, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';

export type QuizQuestion = {
  pregunta: string;
  opciones: string[];
  respuestaCorrecta: number; // índice 0-based
  explicacion?: string;
  retroalimentacion?: string;
};

interface QuizBuilderProps {
  value: QuizQuestion[];
  onChange: (value: QuizQuestion[]) => void;
}

export function QuizBuilder({ value = [], onChange }: QuizBuilderProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const addQuestion = () => {
    const newQuestion: QuizQuestion = {
      pregunta: '',
      opciones: ['', ''],
      respuestaCorrecta: 0,
      explicacion: '',
    };
    onChange([...value, newQuestion]);
    setExpandedIndex(value.length); // Expandir la nueva
  };

  const removeQuestion = (index: number) => {
    const newValue = [...value];
    newValue.splice(index, 1);
    onChange(newValue);
    if (expandedIndex === index) setExpandedIndex(null);
  };

  const updateQuestion = (index: number, field: keyof QuizQuestion, val: any) => {
    const newValue = [...value];
    newValue[index] = { ...newValue[index], [field]: val };
    onChange(newValue);
  };

  const addOption = (qIndex: number) => {
    const question = value[qIndex];
    const newOptions = [...question.opciones, ''];
    updateQuestion(qIndex, 'opciones', newOptions);
  };

  const removeOption = (qIndex: number, oIndex: number) => {
    const question = value[qIndex];
    if (question.opciones.length <= 2) return; // Mínimo 2 opciones

    const newOptions = [...question.opciones];
    newOptions.splice(oIndex, 1);
    
    // Ajustar respuesta correcta si es necesario
    let newCorrect = question.respuestaCorrecta;
    if (oIndex < newCorrect) {
        newCorrect--;
    } else if (oIndex === newCorrect) {
        newCorrect = 0; // Reset a la primera si borramos la correcta
    }

    const newValue = [...value];
    newValue[qIndex] = { ...newValue[qIndex], opciones: newOptions, respuestaCorrecta: newCorrect };
    onChange(newValue);
  };

  const updateOption = (qIndex: number, oIndex: number, text: string) => {
    const question = value[qIndex];
    const newOptions = [...question.opciones];
    newOptions[oIndex] = text;
    updateQuestion(qIndex, 'opciones', newOptions);
  };

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <div className="space-y-4">
      {value.map((q, qIndex) => (
        <div key={qIndex} className="rounded-md border border-[#2a2a2a] bg-[#101010] overflow-hidden">
          {/* Header Pregunta */}
          <div className="flex items-center justify-between bg-[#181818] px-4 py-3">
            <div className="flex items-center gap-3 flex-1">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#2a2a2a] text-xs font-bold text-slate-300">
                {qIndex + 1}
              </span>
              <input
                type="text"
                value={q.pregunta}
                onChange={(e) => updateQuestion(qIndex, 'pregunta', e.target.value)}
                placeholder="Escribe la pregunta..."
                className="flex-1 bg-transparent text-sm font-medium text-slate-100 placeholder:text-slate-600 outline-none"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => removeQuestion(qIndex)}
                className="rounded p-1 text-slate-500 hover:bg-red-900/20 hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => toggleExpand(qIndex)}
                className="rounded p-1 text-slate-500 hover:bg-[#2a2a2a] hover:text-slate-300"
              >
                {expandedIndex === qIndex ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Cuerpo Pregunta (Expandible) */}
          {expandedIndex === qIndex && (
            <div className="p-4 space-y-4 border-t border-[#2a2a2a]">
              
              {/* Opciones */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-400">Opciones de respuesta</label>
                <div className="space-y-2">
                  {q.opciones.map((opt, oIndex) => (
                    <div key={oIndex} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateQuestion(qIndex, 'respuestaCorrecta', oIndex)}
                        className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                          q.respuestaCorrecta === oIndex
                            ? 'border-emerald-500 bg-emerald-500 text-white'
                            : 'border-[#3a3a3a] bg-[#181818] text-transparent hover:border-slate-500'
                        }`}
                        title="Marcar como correcta"
                      >
                        <CheckCircle className="h-3 w-3" />
                      </button>
                      
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                        placeholder={`Opción ${oIndex + 1}`}
                        className={`flex-1 rounded-md border bg-[#181818] px-3 py-1.5 text-sm outline-none transition-colors ${
                            q.respuestaCorrecta === oIndex ? 'border-emerald-500/50 text-emerald-100' : 'border-[#2a2a2a] text-slate-200'
                        }`}
                      />

                      <button
                        type="button"
                        onClick={() => removeOption(qIndex, oIndex)}
                        disabled={q.opciones.length <= 2}
                        className="p-1 text-slate-600 hover:text-red-400 disabled:opacity-30"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => addOption(qIndex)}
                  className="mt-2 flex items-center gap-1 text-xs text-emerald-500 hover:text-emerald-400"
                >
                  <Plus className="h-3 w-3" /> Agregar opción
                </button>
              </div>

              {/* Justificación / Explicación */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-400">Justificación (se muestra al responder)</label>
                <textarea
                  value={q.explicacion || ''}
                  onChange={(e) => updateQuestion(qIndex, 'explicacion', e.target.value)}
                  placeholder="Explica por qué es la respuesta correcta..."
                  rows={2}
                  className="w-full rounded-md border border-[#2a2a2a] bg-[#181818] px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500/50"
                />
              </div>

            </div>
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={addQuestion}
        className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-[#3a3a3a] bg-[#101010] py-3 text-sm text-slate-400 hover:border-emerald-500/50 hover:text-emerald-500 hover:bg-[#181818] transition-colors"
      >
        <Plus className="h-4 w-4" /> Agregar Pregunta
      </button>
    </div>
  );
}
