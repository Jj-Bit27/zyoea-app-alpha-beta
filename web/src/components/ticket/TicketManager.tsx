import { useState } from 'react'
import { IoReceipt, IoChevronForward, IoCash, IoCard, IoTime } from 'react-icons/io5'
import { Card, CardContent } from '../custom/Card'
import { Badge } from '../custom/Badge'
import { Modal } from '../custom/Modal'
import { EmptyState } from '../custom/EmptyState'
import { Spinner } from '../custom/Spinner'
import { useAuth } from '../../context/AuthContext'
import { useUserPayments } from '../../hooks/usePayments'
import { ApolloWrapper } from '../ApolloWrapper'

function TicketManagerContent() {
  const { user } = useAuth()
  const { payments, loading } = useUserPayments(user?.id || '')
  const [selectedPayment, setSelectedPayment] = useState<any>(null)

  if (!user) {
    return (
      <EmptyState
        icon={IoReceipt}
        title="Inicia sesión"
        description="Necesitas iniciar sesión para ver tus tickets"
        action={{ label: 'Iniciar Sesión', onClick: () => window.location.href = '/login' }}
      />
    )
  }

  if (loading) {
    return <div className="flex justify-center py-10"><Spinner size="lg" /></div>
  }

  if (payments.length === 0) {
    return (
      <EmptyState
        icon={IoReceipt}
        title="Sin tickets"
        description="Aquí aparecerán tus pagos y recibos"
      />
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold text-foreground">Mis Tickets</h1>
      <p className="mt-1 text-muted-foreground">Historial de tus pagos</p>

        <div className="mt-6 space-y-4">
          {payments.map((payment: any) => (
            <Card
              key={payment.id}
              hoverable
              className="cursor-pointer transition-colors"
              onClick={() => setSelectedPayment(payment)}
            >
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                  <IoReceipt className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate">{payment.description || `Pago #${payment.id}`}</h3>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <IoTime className="h-4 w-4" />
                      {new Date(payment.createdAt).toLocaleDateString('es-MX', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      })}
                    </span>
                    <span className="flex items-center gap-1">
                      <IoCard className="h-4 w-4" />
                      {payment.currency?.toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-bold text-foreground">${payment.amount}</p>
                  <Badge variant={payment.status === 'succeeded' ? 'success' : 'secondary'}>
                    {payment.status}
                  </Badge>
                </div>
                <IoChevronForward className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          ))}
        </div>

      {/* Payment Detail Modal */}
      <Modal
        isOpen={!!selectedPayment}
        onClose={() => setSelectedPayment(null)}
        title="Detalle del Ticket"
        size="md"
      >
        {selectedPayment && (
          <div className="overflow-hidden rounded-lg shadow-sm">
                        {/* Payment Header */}
            <div className="bg-primary px-4 py-6 text-center text-primary-foreground">
              <h2 className="text-xl font-bold">{selectedPayment?.description || `Pago #${selectedPayment?.id}`}</h2>
              <p className="mt-1 text-sm opacity-80">
                {selectedPayment ? new Date(selectedPayment.createdAt).toLocaleDateString('es-MX', {
                  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                  hour: '2-digit', minute: '2-digit'
                }) : ''}
              </p>
            </div>

            {/* Top Perforation */}
            <div className="relative h-4 bg-card overflow-hidden">
              <div className="absolute -top-2 left-0 right-0 flex justify-between px-1">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div key={i} className="h-4 w-4 rounded-full bg-background" />
                ))}
              </div>
            </div>

            {/* Payment Body */}
            <div className="bg-card px-6 py-4">
              <div className="py-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-foreground">TOTAL</span>
                  <span className="text-xl font-bold text-primary">${selectedPayment?.amount}</span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-muted-foreground">Estado</span>
                  <Badge variant={selectedPayment?.status === 'succeeded' ? 'success' : 'secondary'}>
                    {selectedPayment?.status}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-muted-foreground">Moneda</span>
                  <span className="text-foreground">{selectedPayment?.currency?.toUpperCase()}</span>
                </div>
              </div>

              <div className="mt-8 text-center pb-4">
                <p className="text-xs font-mono text-muted-foreground">Pago #{selectedPayment?.id}</p>
                <p className="mt-2 text-sm text-muted-foreground">¡Gracias por tu preferencia!</p>
              </div>
            </div>

            {/* Bottom Perforation */}
            <div className="relative h-4 bg-card overflow-hidden">
              <div className="absolute -bottom-2 left-0 right-0 flex justify-between px-1">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div key={i} className="h-4 w-4 rounded-full bg-background" />
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default function TicketManager() {
  return (
    <ApolloWrapper>
      <TicketManagerContent />
    </ApolloWrapper>
  )
}