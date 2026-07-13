'use client'

import { useEffect, useRef, useState } from 'react'

export function formatarDuracao(segundos: number) {
  const min = Math.floor(segundos / 60)
  const s = segundos % 60
  return min > 0 ? `${min}min ${s}s` : `${s}s`
}

// Cronômetro simples pra mostrar "rodando há Xmin Ys" enquanto uma geração está em andamento —
// não estimamos tempo restante (a variação entre consultores é grande demais pra isso fazer
// sentido, ver CONTEXTO_E_CHECKLIST.md), só o tempo decorrido.
export function useCronometro(ativo: boolean) {
  const [segundos, setSegundos] = useState(0)
  const inicioRef = useRef<number | null>(null)

  useEffect(() => {
    if (!ativo) {
      inicioRef.current = null
      setSegundos(0)
      return
    }
    inicioRef.current = Date.now()
    setSegundos(0)
    const id = setInterval(() => {
      if (inicioRef.current) {
        setSegundos(Math.floor((Date.now() - inicioRef.current) / 1000))
      }
    }, 1000)
    return () => clearInterval(id)
  }, [ativo])

  return segundos
}
