import { useState } from 'react'
import { IoReceipt, IoChevronForward, IoCash, IoCard, IoTime, IoRestaurant, IoCart } from 'react-icons/io5'
import { Card, CardContent } from '../custom/Card'
import { Badge } from '../custom/Badge'
import { Modal } from '../custom/Modal'
import { EmptyState } from '../custom/EmptyState'
import { Spinner } from '../custom/Spinner'
import { useAuth } from '../../context/AuthContext'
import { useUserPayments } from '../../hooks/usePayments'
import { useUserOrders } from '../../hooks/useOrders'
import { useOrderById } from '../../hooks/useOrders'
import { ApolloWrapper } from '../ApolloWrapper'
import type { Payment, Order } from '../../types'

function TicketManagerContent() {
  const { user } = useAuth()
  const { payments, loading: paymentsLoading } = useUserPayments(user?.id || '')
  const { orders, loading: ordersLoading } = useUserOrders(user?.id || '')
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const { order: orderDetail, loading: orderLoading } = useOrderById(
    selectedPayment?.orderId ? String(selectedPayment.orderId) : selectedOrder?.id || '',
  )

  const handleSelectPayment = (payment: Payment) => {
    setSelectedPayment(payment)
    setSelectedOrder(null)
  }

  const handleSelectOrder = (order: Order) => {
    setSelectedOrder(order)
    setSelectedPayment(null)
  }

  const paidOrders = orders.filter((o: Order) => o.paid)
  const displayItems = [
    ...payments.map((p: Payment) => ({ type: 'payment' as const, data: p })),
    ...paidOrders.map((o: Order) => ({ type: 'order' as const, data: o })),
  ].sort((a, b) => {
    const dateA = a.type === 'payment'
      ? new Date(a.data.createdAt).getTime()
      : new Date(a.data.date).getTime()
    const dateB = b.type === 'payment'
      ? new Date(b.data.createdAt).getTime()
      : new Date(b.data.date).getTime()
    return dateB - dateA
  })

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

  if (paymentsLoading || ordersLoading) {
    return <div className="flex justify-center py-10"><Spinner size="lg" /></div>
  }

  if (displayItems.length === 0) {
    return (
      <EmptyState
        icon={IoReceipt}
        title="Sin tickets"
        description="Aquí aparecerán tus pagos y recibos"
      />
    )
  }

  const currentDescription = selectedPayment?.description || (selectedOrder ? `Orden #${selectedOrder.id}` : '')
  const currentAmount = selectedPayment?.amount || selectedOrder?.total || 0
  const currentCreatedAt = selectedPayment?.createdAt || selectedOrder?.date || ''
  const currentStatus = selectedPayment?.status || (selectedOrder?.paid ? 'succeeded' : '')

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold text-foreground">Mis Tickets</h1>
      <p className="mt-1 text-muted-foreground">Historial de tus pagos y órdenes</p>

      <div className="mt-6 space-y-4">
        {displayItems.map((item) => {
          const isPayment = item.type === 'payment'
          const d = item.data as any
          return (
            <Card
              key={`${item.type}-${d.id}`}
              hoverable
              className="cursor-pointer transition-colors"
              onClick={() => isPayment ? handleSelectPayment(d) : handleSelectOrder(d)}
            >
              <CardContent className="flex items-center gap-4 p-4">
                <div className={`flex h-12 w-12 items-center justify-center rounded-lg shrink-0 ${isPayment ? 'bg-primary/10' : 'bg-green-100 dark:bg-green-900/30'}`}>
                  {isPayment ? <IoReceipt className="h-6 w-6 text-primary" /> : <IoCart className="h-6 w-6 text-green-600 dark:text-green-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate">
                    {isPayment ? (d.description || `Pago #${d.id}`) : `Orden #${d.id}`}
                  </h3>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <IoTime className="h-4 w-4" />
                      {new Date(isPayment ? d.createdAt : d.date).toLocaleDateString('es-MX', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      })}
                    </span>
                    {isPayment && (
                      <span className="flex items-center gap-1">
                        <IoCard className="h-4 w-4" />
                        {d.currency?.toUpperCase()}
                      </span>
                    )}
                    {!isPayment && (
                      <Badge variant="success">Pagada</Badge>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-bold text-foreground">${(isPayment ? d.amount : d.total)?.toFixed(2)}</p>
                  {isPayment && (
                    <Badge variant={d.status === 'succeeded' ? 'success' : 'secondary'}>
                      {d.status}
                    </Badge>
                  )}
                </div>
                <IoChevronForward className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Modal
        isOpen={!!selectedPayment || !!selectedOrder}
        onClose={() => { setSelectedPayment(null); setSelectedOrder(null) }}
        title="Detalle del Ticket"
        size="md"
      >
        <div className="overflow-hidden rounded-lg shadow-sm">
          <div className="bg-primary px-4 py-6 text-center text-primary-foreground">
            <h2 className="text-xl font-bold">{currentDescription}</h2>
            <p className="mt-1 text-sm opacity-80">
              {currentCreatedAt ? new Date(currentCreatedAt).toLocaleDateString('es-MX', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
              }) : ''}
            </p>
          </div>

          <div className="h-4 bg-card relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle,_var(--color-background)_3px,_transparent_3px)] bg-[length:12px_12px]" />
          </div>

          <div className="bg-card px-6 py-4">
            <div className="py-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold text-foreground">TOTAL</span>
                <span className="text-xl font-bold text-primary">${currentAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm mt-2">
                <span className="text-muted-foreground">Estado</span>
                <Badge variant={currentStatus === 'succeeded' ? 'success' : 'success'}>
                  {currentStatus ? (currentStatus === 'succeeded' ? 'Completado' : currentStatus) : 'Pagada'}
                </Badge>
              </div>
            </div>

            {(selectedPayment?.orderId || selectedOrder?.id) && (
              <div className="border-t border-border pt-4 mt-2">
                <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <IoRestaurant className="text-primary" />
                  Orden #{selectedPayment?.orderId || selectedOrder?.id}
                </h4>
                {orderLoading ? (
                  <div className="flex justify-center py-4">
                    <Spinner size="sm" />
                  </div>
                ) : orderDetail ? (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total orden</span>
                      <span className="text-primary font-semibold">${orderDetail.total.toFixed(2)}</span>
                    </div>
                    {orderDetail.orderDetail && orderDetail.orderDetail.length > 0 && (
                      <div className="space-y-1">
                        {orderDetail.orderDetail.map((det: any) => (
                          <div key={det.id || det.productId} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{det.quantity}x {det.product?.name || `Producto #${det.productId}`}</span>
                            <span className="text-foreground">${det.subtotal.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No se pudo cargar la orden</p>
                )}
              </div>
            )}

            <div className="mt-8 text-center pb-4">
              <p className="text-xs font-mono text-muted-foreground">
                {selectedPayment ? `Pago #${selectedPayment.id}` : `Orden #${selectedOrder?.id}`}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">¡Gracias por tu preferencia!</p>
            </div>
          </div>

          <div className="h-4 bg-card relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle,_var(--color-background)_3px,_transparent_3px)] bg-[length:12px_12px]" />
          </div>
        </div>
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
