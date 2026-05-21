import React, { useEffect, useState, type ReactNode } from 'react'
import { atom } from 'nanostores'
import { useStore } from '@nanostores/react'

export type Theme = 'light' | 'dark' | 'system'

// --- 1. Estado Global ---
export const $theme = atom<Theme>('system')

// --- 2. Lógica de Actualización del DOM ---
// Esta función se encarga de añadir/quitar la clase 'dark'
const applyThemeToDom = (theme: Theme) => {
  if (typeof window === 'undefined') return

  const root = document.documentElement
  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  if (isDark) {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

// --- 3. Acción Pública ---
const setTheme = (theme: Theme) => {
  $theme.set(theme)
  if (typeof window !== 'undefined') {
    localStorage.setItem('theme', theme)
    applyThemeToDom(theme)
  }
}

// --- 4. Componente Provider ---
// En Astro, este componente principalmente inicializa los listeners del sistema
export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    // 1. Leer localStorage al montar (por si el script inline falló o para sincronizar)
    const stored = localStorage.getItem('theme') as Theme | null
    if (stored) {
      $theme.set(stored)
    }

    // 2. Escuchar cambios en la preferencia del sistema operativo
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      if ($theme.get() === 'system') {
        applyThemeToDom('system')
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  // En Astro no necesitamos un Context.Provider real gracias a Nano Stores,
  // pero mantenemos la estructura para no romper tu Layout.
  return <>{children}</>
}

// --- 5. Hook Personalizado ---
export function useTheme() {
  const theme = useStore($theme)
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')

  // Calculamos el tema resuelto para la UI (iconos)
  useEffect(() => {
    if (theme === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      setResolvedTheme(isDark ? 'dark' : 'light')
    } else {
      setResolvedTheme(theme)
    }
  }, [theme])

  return {
    theme,
    setTheme,
    resolvedTheme,
  }
}