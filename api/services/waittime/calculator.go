package waittime

import (
	"context"
	"fmt"
	"math"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// WaitTimeConfig contiene la configuración de tiempos de espera por restaurante
type WaitTimeConfig struct {
	ID              int
	RestaurantID    int
	BaseTime        int     // minutos mínimos
	AvgPrepTime     int     // promedio histórico
	PeakHourStart   int     // 0-23 (hora del día)
	PeakHourEnd     int     // 0-23
	PeakFactor      float64 // multiplicador en hora pico
}

// Calculator es el servicio principal de cálculo de tiempos
type Calculator struct {
	DB *pgxpool.Pool
}

func NewCalculator(db *pgxpool.Pool) *Calculator {
	return &Calculator{DB: db}
}

// GetConfig obtiene la configuración de tiempos para un restaurante
func (c *Calculator) GetConfig(ctx context.Context, restaurantID int) (*WaitTimeConfig, error) {
	var config WaitTimeConfig

	sql := `
		SELECT id, restaurant_id, base_time, avg_prep_time, peak_hour_start, peak_hour_end, peak_factor
		FROM restaurant_wait_config
		WHERE restaurant_id = $1
	`

	err := c.DB.QueryRow(ctx, sql, restaurantID).Scan(
		&config.ID,
		&config.RestaurantID,
		&config.BaseTime,
		&config.AvgPrepTime,
		&config.PeakHourStart,
		&config.PeakHourEnd,
		&config.PeakFactor,
	)

	if err != nil {
		// Si no existe config, retornar valores por defecto
		return &WaitTimeConfig{
			RestaurantID:  restaurantID,
			BaseTime:      3,
			AvgPrepTime:   12,
			PeakHourStart: 12,
			PeakHourEnd:   14,
			PeakFactor:    1.5,
		}, nil
	}

	return &config, nil
}

// CreateConfig crea la configuración inicial para un restaurante
func (c *Calculator) CreateConfig(ctx context.Context, restaurantID int) (*WaitTimeConfig, error) {
	config := &WaitTimeConfig{
		RestaurantID:  restaurantID,
		BaseTime:      3,
		AvgPrepTime:   12,
		PeakHourStart: 12,
		PeakHourEnd:   14,
		PeakFactor:    1.5,
	}

	sql := `
		INSERT INTO restaurant_wait_config 
		(restaurant_id, base_time, avg_prep_time, peak_hour_start, peak_hour_end, peak_factor)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id
	`

	err := c.DB.QueryRow(ctx, sql,
		config.RestaurantID,
		config.BaseTime,
		config.AvgPrepTime,
		config.PeakHourStart,
		config.PeakHourEnd,
		config.PeakFactor,
	).Scan(&config.ID)

	if err != nil {
		return nil, fmt.Errorf("error creando config: %w", err)
	}

	return config, nil
}

// isPeakHour determina si la hora actual es hora pico
func (c *Calculator) isPeakHour(config *WaitTimeConfig, now time.Time) bool {
	currentHour := now.Hour()

	if config.PeakHourStart <= config.PeakHourEnd {
		return currentHour >= config.PeakHourStart && currentHour < config.PeakHourEnd
	}

	// Si la hora pico cruza la medianoche (ej: 22:00 a 02:00)
	return currentHour >= config.PeakHourStart || currentHour < config.PeakHourEnd
}

// getQueueCount obtiene el número de órdenes en cola (pending + in_progress)
func (c *Calculator) getQueueCount(ctx context.Context, restaurantID int) (int, error) {
	var count int

	sql := `
		SELECT COUNT(*)
		FROM orders
		WHERE restaurant = $1 AND status IN ('ABIERTA', 'LISTA')
	`

	err := c.DB.QueryRow(ctx, sql, restaurantID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("error contando cola: %w", err)
	}

	return count, nil
}

// getComplexityFactor calcula el factor de complejidad basado en número de items
func (c *Calculator) getComplexityFactor(itemCount int) float64 {
	// Cada item agrega 1.5 minutos adicionales
	// Pero con reducción logarítmica para órdenes muy grandes
	if itemCount <= 0 {
		return 0
	}

	baseFactor := float64(itemCount) * 1.5
	// Aplicar logaritmo para evitar que órdenes muy grandes exploten el tiempo
	adjustedFactor := baseFactor * math.Log(float64(itemCount)+1) / math.Log(5)

	return adjustedFactor
}

// CalculateWaitTime calcula el tiempo de espera en minutos
// itemCount: número de items en la orden
// restaurantID: ID del restaurante
func (c *Calculator) CalculateWaitTime(ctx context.Context, restaurantID int, itemCount int) (int, error) {
	// 1. Obtener configuración
	config, err := c.GetConfig(ctx, restaurantID)
	if err != nil {
		return 0, err
	}

	// 2. Contar órdenes en cola
	queueCount, err := c.getQueueCount(ctx, restaurantID)
	if err != nil {
		return 0, err
	}

	// 3. Calcular factor de complejidad
	complexityFactor := c.getComplexityFactor(itemCount)

	// 4. Detectar si es hora pico
	now := time.Now()
	isPeak := c.isPeakHour(config, now)
	peakMultiplier := 1.0
	if isPeak {
		peakMultiplier = config.PeakFactor
	}

	// 5. Fórmula de cálculo
	baseTime := float64(config.BaseTime)
	queueTime := float64(queueCount * config.AvgPrepTime)
	totalWaitTime := (baseTime + queueTime + complexityFactor) * peakMultiplier

	// 6. Redondear al siguiente minuto
	waitTimeMinutes := int(math.Ceil(totalWaitTime))

	// 7. Asegurar un mínimo de tiempo
	if waitTimeMinutes < config.BaseTime {
		waitTimeMinutes = config.BaseTime
	}

	return waitTimeMinutes, nil
}

// RecordOrderCompletion registra una orden completada en las métricas
func (c *Calculator) RecordOrderCompletion(
	ctx context.Context,
	restaurantID int,
	orderID int,
	itemCount int,
	preparedTimeMinutes int,
	queuePosition int,
	wasPeakHour bool,
) error {
	sql := `
		INSERT INTO order_metrics 
		(restaurant_id, order_id, item_count, prepared_time_minutes, queue_position, was_peak_hour)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (order_id) DO NOTHING
	`

	_, err := c.DB.Exec(ctx, sql,
		restaurantID,
		orderID,
		itemCount,
		preparedTimeMinutes,
		queuePosition,
		wasPeakHour,
	)

	if err != nil {
		return fmt.Errorf("error registrando métrica: %w", err)
	}

	return nil
}

// UpdateAveragePrepTime actualiza el promedio de tiempo de preparación
func (c *Calculator) UpdateAveragePrepTime(ctx context.Context, restaurantID int) error {
	// Calcular promedio de las últimas 100 órdenes completadas
	sql := `
		SELECT AVG(prepared_time_minutes)
		FROM order_metrics
		WHERE restaurant_id = $1
		ORDER BY created_at DESC
		LIMIT 100
	`

	var avgPrepTime *int
	err := c.DB.QueryRow(ctx, sql, restaurantID).Scan(&avgPrepTime)
	if err != nil {
		return fmt.Errorf("error calculando promedio: %w", err)
	}

	if avgPrepTime == nil {
		return nil // No hay datos todavía
	}

	// Actualizar la configuración
	updateSQL := `
		UPDATE restaurant_wait_config
		SET avg_prep_time = $1, updated_at = NOW()
		WHERE restaurant_id = $2
	`

	_, err = c.DB.Exec(ctx, updateSQL, *avgPrepTime, restaurantID)
	if err != nil {
		return fmt.Errorf("error actualizando config: %w", err)
	}

	return nil
}

// GetRestaurantMetrics obtiene las métricas agregadas de un restaurante
type RestaurantMetrics struct {
	RestaurantID       int
	TotalOrders        int
	AveragePrepTime    int
	MedianPrepTime     int
	PeakHourOrders     int
	NonPeakHourOrders  int
	MostCommonItemCount int
}

func (c *Calculator) GetRestaurantMetrics(ctx context.Context, restaurantID int) (*RestaurantMetrics, error) {
	metrics := &RestaurantMetrics{
		RestaurantID: restaurantID,
	}

	sql := `
		SELECT 
			COUNT(*) as total_orders,
			COALESCE(AVG(prepared_time_minutes)::INT, 0) as avg_prep_time,
			COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY prepared_time_minutes)::INT, 0) as median_prep_time,
			COALESCE(SUM(CASE WHEN was_peak_hour THEN 1 ELSE 0 END), 0) as peak_hour_orders,
			COALESCE(SUM(CASE WHEN NOT was_peak_hour THEN 1 ELSE 0 END), 0) as non_peak_hour_orders,
			COALESCE(MODE() WITHIN GROUP (ORDER BY item_count)::INT, 0) as most_common_item_count
		FROM order_metrics
		WHERE restaurant_id = $1
	`

	err := c.DB.QueryRow(ctx, sql, restaurantID).Scan(
		&metrics.TotalOrders,
		&metrics.AveragePrepTime,
		&metrics.MedianPrepTime,
		&metrics.PeakHourOrders,
		&metrics.NonPeakHourOrders,
		&metrics.MostCommonItemCount,
	)

	if err != nil {
		return nil, fmt.Errorf("error obteniendo métricas: %w", err)
	}

	return metrics, nil
}
