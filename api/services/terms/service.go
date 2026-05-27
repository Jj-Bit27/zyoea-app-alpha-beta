package terms

import (
	"context"
	"fmt"
	"time"

	"api/graph/model"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Service struct {
	db *pgxpool.Pool
}

func NewService(db *pgxpool.Pool) *Service {
	return &Service{db: db}
}

func (s *Service) GetTermsContent(ctx context.Context, typeArg model.TermsType) (*model.TermsContent, error) {
	content := s.getDefaultContent(typeArg)
	return content, nil
}

func (s *Service) GetCurrentTermsAcceptance(ctx context.Context, userID int, typeArg model.TermsType) (*model.TermsAcceptance, error) {
	var ta model.TermsAcceptance
	err := s.db.QueryRow(ctx, `
		SELECT id, terms_type, accepted_at
		FROM terms_acceptance
		WHERE user_id = $1 AND terms_type = $2
	`, userID, string(typeArg)).Scan(&ta.ID, &ta.TermsType, &ta.AcceptedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("get terms acceptance: %w", err)
	}
	ta.ID = fmt.Sprintf("%d", 0) // placeholder
	return &ta, nil
}

func (s *Service) CheckPendingTermsAcceptance(ctx context.Context, userID int) ([]model.TermsType, error) {
	accepted, err := s.db.Query(ctx, `
		SELECT terms_type FROM terms_acceptance WHERE user_id = $1
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("check pending terms: %w", err)
	}
	defer accepted.Close()

	acceptedMap := make(map[string]bool)
	for accepted.Next() {
		var t string
		if err := accepted.Scan(&t); err != nil {
			return nil, fmt.Errorf("scan: %w", err)
		}
		acceptedMap[t] = true
	}

	var pending []model.TermsType
	for _, t := range model.AllTermsType {
		if !acceptedMap[string(t)] {
			pending = append(pending, t)
		}
	}
	return pending, nil
}

func (s *Service) AcceptTerms(ctx context.Context, userID int, typeArg model.TermsType) (*model.TermsAcceptance, error) {
	_, err := s.db.Exec(ctx, `
		INSERT INTO terms_acceptance (user_id, terms_type, accepted_at, ip_address, user_agent, version)
		VALUES ($1, $2, NOW(), '0.0.0.0'::inet, 'server', '1.0')
		ON CONFLICT (user_id, terms_type) DO NOTHING
	`, userID, string(typeArg))
	if err != nil {
		return nil, fmt.Errorf("accept terms: %w", err)
	}

	return &model.TermsAcceptance{
		ID:         "0",
		TermsType:  typeArg,
		AcceptedAt: time.Now(),
	}, nil
}

func (s *Service) getDefaultContent(typeArg model.TermsType) *model.TermsContent {
	switch typeArg {
	case model.TermsTypeUserTerms:
		return &model.TermsContent{
			Type:    typeArg,
			Title:   "Términos y Condiciones - Usuario",
			Content: "<p>Al usar Zyoea App aceptas estos términos. La plataforma conecta usuarios con restaurantes para realizar pedidos.</p><h3>1. Uso del Servicio</h3><p>Debes ser mayor de edad para usar la aplicación. Eres responsable de tu cuenta y de la veracidad de tus datos.</p><h3>2. Pedidos y Pagos</h3><p>Los pedidos están sujetos a disponibilidad del restaurante. Los pagos se procesan a través de Stripe.</p><h3>3. Privacidad</h3><p>Tus datos personales serán tratados según nuestra Política de Privacidad.</p>",
			Version:     "1.0",
			LastUpdated: time.Date(2025, 5, 1, 0, 0, 0, 0, time.UTC),
		}
	case model.TermsTypeRestaurantTerms:
		return &model.TermsContent{
			Type:    typeArg,
			Title:   "Términos y Condiciones - Restaurante",
			Content: "<p>Al registrarte como restaurante en Zyoea App aceptas estos términos.</p><h3>1. Comisiones</h3><p>Se aplicará una comisión del 5% sobre cada pago procesado con tarjeta.</p><h3>2. Pagos</h3><p>Los pagos se realizan a través de Stripe Connect directamente a tu cuenta bancaria.</p><h3>3. Responsabilidad</h3><p>Eres responsable de la calidad del servicio y productos ofrecidos.</p>",
			Version:     "1.0",
			LastUpdated: time.Date(2025, 5, 1, 0, 0, 0, 0, time.UTC),
		}
	case model.TermsTypePrivacyPolicy:
		return &model.TermsContent{
			Type:    typeArg,
			Title:   "Política de Privacidad",
			Content: "<p>En Zyoea App nos comprometemos a proteger tu privacidad.</p><h3>1. Datos Recopilados</h3><p>Recopilamos nombre, email, preferencias de pedido e información de pago necesaria.</p><h3>2. Uso de Datos</h3><p>Usamos tus datos para procesar pedidos, mejorar el servicio y enviar comunicaciones relevantes.</p><h3>3. Seguridad</h3><p>Implementamos medidas de seguridad para proteger tu información personal.</p>",
			Version:     "1.0",
			LastUpdated: time.Date(2025, 5, 1, 0, 0, 0, 0, time.UTC),
		}
	}
	return nil
}
