import { type ImgHTMLAttributes, forwardRef, useState } from 'react'

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl'

// Extendemos la interfaz para aceptar 'name' también, facilitando la integración
interface AvatarProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'size'> {
  size?: AvatarSize
  fallback?: string
  name?: string
}

const sizeStyles: Record<AvatarSize, string> = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
}

const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  ({ className = '', size = 'md', src, alt, fallback, name, ...props }, ref) => {
    const [hasError, setHasError] = useState(false)

    // Lógica mejorada: Intenta usar el fallback, luego el nombre, luego el alt, o un '?'
    const initials = 
      fallback || 
      name?.charAt(0).toUpperCase() || 
      alt?.charAt(0).toUpperCase() || 
      '?'

    // Si no hay imagen o hubo error al cargarla, mostramos las iniciales
    if (!src || hasError) {
      return (
        <div
          ref={ref}
          className={`flex items-center justify-center rounded-full bg-primary text-primary-foreground font-medium ${sizeStyles[size]} ${className}`}
        >
          {initials}
        </div>
      )
    }

    return (
      <div ref={ref} className={`relative overflow-hidden rounded-full ${sizeStyles[size]} ${className}`}>
        <img
          src={src || "/placeholder.svg"}
          alt={alt || name || "Avatar"}
          onError={() => setHasError(true)}
          className="h-full w-full object-cover"
          {...props}
        />
      </div>
    )
  }
)

Avatar.displayName = 'Avatar'

export { Avatar, type AvatarSize }