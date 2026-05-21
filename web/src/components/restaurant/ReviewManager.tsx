import { useState, useMemo } from 'react'
import { IoAdd, IoStar, IoTrash, IoPencil } from 'react-icons/io5'
import { Card, CardContent } from '../custom/Card'
import { Button } from '../custom/Button'
import { Avatar } from '../custom/Avatar'
import { Rating } from '../custom/Rating'
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../custom/Modal'
import { Input } from '../custom/Input'
import { Textarea } from '../custom/Textarea'
import { EmptyState } from '../custom/EmptyState'
import { Spinner } from '../custom/Spinner'
import { useToast } from '../custom/Toast'
import { useAuth } from '../../context/AuthContext'
import { useReviews } from '../../hooks/useReviews'
import { ApolloWrapper } from '../ApolloWrapper'

function ReviewManagerContent({ restaurantId, restaurantName }: { restaurantId: string, restaurantName: string }) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const { reviews, loading, error, createReview, deleteReview } = useReviews(restaurantId)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newReview, setNewReview] = useState({ title: '', content: '', rating: 5 })

  const userReview = useMemo(() => reviews.find((r: any) => String(r.userId) === user?.id), [reviews, user?.id])

  const averageRating = reviews.length > 0
    ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length
    : 0

  const handleSubmitReview = () => {
    if (!newReview.content.trim()) {
      showToast('Escribe un comentario', 'error')
      return
    }
    if (!user?.id) {
      showToast('Inicia sesión para escribir una reseña', 'error')
      return
    }
    createReview({
      restaurant: parseInt(restaurantId),
      user: parseInt(user.id),
      rating: newReview.rating,
      comment: newReview.content,
    })
    setIsModalOpen(false)
    setNewReview({ title: '', content: '', rating: 5 })
  }

  if (loading) return <div className="flex justify-center py-10"><Spinner size="lg" /></div>
  if (error) return <div className="p-4 bg-destructive/10 text-destructive rounded-lg">{error.message}</div>

  return (
    <>
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold">Reseñas {restaurantName ? `de ${restaurantName}` : ''}</h1>
          <div className="mt-2 flex items-center gap-3">
            <Rating value={averageRating} />
            <span className="text-lg font-semibold">{averageRating.toFixed(1)}</span>
            <span className="text-muted-foreground">({reviews.length} reseñas)</span>
          </div>
        </div>
        {user && !userReview && (
          <Button onClick={() => setIsModalOpen(true)}><IoAdd /> Escribir Reseña</Button>
        )}
      </div>

      {reviews.length === 0 ? (
        <EmptyState icon={IoStar} title="Aún no hay reseñas" description="Sé el primero en compartir tu experiencia" action={user ? { label: 'Escribir Reseña', onClick: () => setIsModalOpen(true) } : undefined} />
      ) : (
        <div className="space-y-4">
          {reviews.map((review: any) => (
            <Card key={review.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <Avatar name={review.user?.name} />
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <div>
                        <p className="font-semibold">{review.user?.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Rating value={review.rating} size="sm" />
                          <span className="text-xs text-muted-foreground">{review.date ? new Date(review.date).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }) : ''}</span>
                        </div>
                      </div>
                      {String(review.userId) === user?.id && (
                        <div className="flex gap-1">
                          <button onClick={() => deleteReview(review.id)} className="p-1.5 hover:bg-destructive/10 text-destructive rounded"><IoTrash className="h-4 w-4" /></button>
                        </div>
                      )}
                    </div>
                    <p className="mt-2 text-muted-foreground">{review.comment}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <ModalHeader onClose={() => setIsModalOpen(false)}>Nueva Reseña</ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <Rating value={newReview.rating} size="lg" interactive onChange={(v) => setNewReview({ ...newReview, rating: v })} />
            <Textarea label="Tu reseña" value={newReview.content} onChange={(e) => setNewReview({ ...newReview, content: e.target.value })} />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
          <Button onClick={handleSubmitReview}>Publicar</Button>
        </ModalFooter>
      </Modal>
    </>
  )
}

export default function ReviewManager({ restaurantId, restaurantName }: { restaurantId: string, restaurantName: string }) {
  return (
    <ApolloWrapper>
      <ReviewManagerContent restaurantId={restaurantId} restaurantName={restaurantName} />
    </ApolloWrapper>
  )
}