import { useState, useEffect } from 'react'
import { atom } from 'nanostores'
import { useStore } from '@nanostores/react'
import { IoCheckmarkCircle, IoAlertCircle, IoInformationCircle, IoClose } from 'react-icons/io5'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id: string
  message: string
  type: ToastType
}

// --- 1. Estado Global con Nano Stores ---
const $toasts = atom<Toast[]>([])

// --- 2. Acciones Globales (Disponibles para toda la app) ---
export const addToast = (message: string, type: ToastType = 'info') => {
  const id = Date.now().toString()
  const newToast = { id, message, type }
  
  // Añadimos el toast al array
  $toasts.set([...$toasts.get(), newToast])

  // Auto-eliminar después de 4 segundos
  setTimeout(() => {
    $toasts.set($toasts.get().filter((t) => t.id !== id))
  }, 4000)
}

export const removeToast = (id: string) => {
  $toasts.set($toasts.get().filter((t) => t.id !== id))
}

// --- 3. Constantes de Estilo ---
const icons = {
  success: IoCheckmarkCircle,
  error: IoAlertCircle,
  info: IoInformationCircle,
  warning: IoAlertCircle,
}

const styles = {
  success: 'bg-success text-success-foreground',
  error: 'bg-destructive text-destructive-foreground',
  info: 'bg-primary text-primary-foreground',
  warning: 'bg-warning text-warning-foreground',
}

// --- 4. Componente Visual (El Contenedor) ---
// Este componente solo se encarga de RENDERIZAR las notificaciones.
// Debe colocarse en el Layout principal.
export function ToastContainer() {
  const toasts = useStore($toasts)

  return (
    <div className="fixed bottom-4 right-4 z-100 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => {
        const Icon = icons[toast.type]
        return (
          <div
            key={toast.id}
            className={`flex items-center gap-2 rounded-lg px-4 py-3 shadow-lg animate-in slide-in-from-right fade-in duration-300 pointer-events-auto ${styles[toast.type]}`}
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span className="text-sm font-medium">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-2 rounded p-0.5 hover:bg-white/20 transition-colors"
            >
              <IoClose className="h-4 w-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}

// --- 5. Hook de Compatibilidad ---
// Mantenemos esto para que no tengas que cambiar tu código existente en los componentes.
export function useToast() {
  return { showToast: addToast }
}

// Exportamos también ToastProvider aunque ya no haga nada, 
// para evitar errores si algún import quedó colgado, 
// pero idealmente deberías borrarlo de tus componentes.
export function ToastProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}