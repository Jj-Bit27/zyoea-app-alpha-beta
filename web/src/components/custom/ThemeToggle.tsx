import { useState, useRef, useEffect } from 'react'
import { IoSunny, IoMoon, IoDesktop } from 'react-icons/io5'
import { useTheme } from '../../context/ThemeContext'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Cierra el menú si se hace clic fuera de él
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const themes = [
    { value: 'light', label: 'Claro', icon: IoSunny },
    { value: 'dark', label: 'Oscuro', icon: IoMoon },
    { value: 'system', label: 'Sistema', icon: IoDesktop },
  ] as const

  // Determina qué icono mostrar en el botón principal basado en la configuración actual
  const CurrentIcon = theme === 'light' ? IoSunny : theme === 'dark' ? IoMoon : IoDesktop

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-10 w-10 items-center justify-center rounded-lg text-foreground hover:bg-secondary transition-colors"
        aria-label="Cambiar tema"
      >
        <CurrentIcon className="h-5 w-5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-36 rounded-lg border border-border bg-card py-1 shadow-lg z-50 animate-in fade-in slide-in-from-top-2">
          {themes.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => {
                setTheme(value)
                setIsOpen(false)
              }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-secondary ${
                theme === value ? 'text-primary font-medium' : 'text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}