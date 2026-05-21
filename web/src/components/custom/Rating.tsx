import { IoStar, IoStarHalf, IoStarOutline } from 'react-icons/io5'

interface RatingProps {
  value: number
  max?: number
  size?: 'sm' | 'md' | 'lg'
  showValue?: boolean
  interactive?: boolean
  onChange?: (value: number) => void
}

const sizeStyles = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
}

export function Rating({ value, max = 5, size = 'md', showValue, interactive, onChange }: RatingProps) {
  const stars = []

  for (let i = 1; i <= max; i++) {
    // Calculamos qué icono mostrar
    const isFull = i <= Math.floor(value)
    // Si no está llena, verificamos si es media estrella (ej: 4.5 >= 4.5)
    // Nota: La lógica original para media estrella era "i - 0.5 <= value".
    // Ejemplo: value=4.5, i=5. 5-0.5 = 4.5 <= 4.5 -> True (Media estrella en la posición 5)
    const isHalf = !isFull && i - 0.5 <= value

    const Star = isFull ? IoStar : isHalf ? IoStarHalf : IoStarOutline

    stars.push(
      <button
        key={i}
        type="button"
        disabled={!interactive}
        // Si es interactivo, llamamos a onChange con el índice (valor de la estrella)
        onClick={() => interactive && onChange?.(i)}
        className={`text-warning ${interactive ? 'cursor-pointer hover:scale-110 transition-transform focus:outline-none' : 'cursor-default'}`}
        aria-label={interactive ? `Calificar con ${i} estrellas` : undefined}
      >
        <Star className={sizeStyles[size]} />
      </button>
    )
  }

  return (
    <div className="flex items-center gap-0.5">
      {stars}
      {showValue && (
        <span className="ml-1 text-sm text-muted-foreground font-medium">{value.toFixed(1)}</span>
      )}
    </div>
  )
}