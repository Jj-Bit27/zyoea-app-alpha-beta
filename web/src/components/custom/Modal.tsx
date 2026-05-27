import {
  type HTMLAttributes,
  type ReactNode,
  forwardRef,
  useEffect,
} from "react";
import { IoClose } from "react-icons/io5";

interface ModalProps extends HTMLAttributes<HTMLDivElement> {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
}

const sizeStyles = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  full: "max-w-4xl",
};

const Modal = forwardRef<HTMLDivElement, ModalProps>(
  (
    {
      isOpen,
      onClose,
      title,
      description,
      children,
      size = "md",
      className = "",
      ...props
    },
    ref,
  ) => {
    // Manejo de efectos secundarios: Scroll Lock y Tecla Escape
    useEffect(() => {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
      };

      if (isOpen) {
        document.addEventListener("keydown", handleEscape);
        // Bloqueamos el scroll del body para evitar que la página de fondo se mueva
        document.body.style.overflow = "hidden";
      }

      return () => {
        document.removeEventListener("keydown", handleEscape);
        // Restauramos el scroll al cerrar
        document.body.style.overflow = "";
      };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
        {/* Backdrop (Fondo oscuro) */}
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Modal Content */}
        <div
          ref={ref}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? "modal-title" : undefined}
          aria-describedby={description ? "modal-description" : undefined}
          className={`relative z-10 w-full ${sizeStyles[size]} max-h-[85vh] overflow-y-auto rounded-xl bg-card p-4 sm:p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200 ${className}`}
          {...props}
        >
          {/* Botón de cerrar absoluto (solo si no se usa ModalHeader explícito con botón) */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors z-20"
            aria-label="Cerrar"
          >
            <IoClose className="h-5 w-5" />
          </button>

          {/* Renderizado opcional de título/descripción vía props */}
          {title && (
            <h2
              id="modal-title"
              className="text-lg font-semibold text-foreground pr-8"
            >
              {title}
            </h2>
          )}

          {description && (
            <p
              id="modal-description"
              className="mt-1 text-sm text-muted-foreground pr-8"
            >
              {description}
            </p>
          )}

          <div className={title || description ? "mt-4" : ""}>{children}</div>
        </div>
      </div>
    );
  },
);

Modal.displayName = "Modal";

// --- Subcomponentes para composición avanzada ---

interface ModalHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  onClose?: () => void;
}

function ModalHeader({
  children,
  onClose,
  className = "",
  ...props
}: ModalHeaderProps) {
  return (
    <div
      className={`flex items-center justify-between pb-4 border-b border-border ${className}`}
      {...props}
    >
      <h2 className="text-lg font-semibold text-foreground">{children}</h2>
    </div>
  );
}

interface ModalBodyProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

function ModalBody({ children, className = "", ...props }: ModalBodyProps) {
  return (
    <div className={`py-4 ${className}`} {...props}>
      {children}
    </div>
  );
}

interface ModalFooterProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

function ModalFooter({ children, className = "", ...props }: ModalFooterProps) {
  return (
    <div
      className={`flex items-center justify-end gap-3 pt-4 border-t border-border ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export { Modal, ModalHeader, ModalBody, ModalFooter };
