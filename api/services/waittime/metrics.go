package waittime

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// MetricsService maneja operaciones relacionadas con métricas
type MetricsService struct {
	DB *pgxpool.Pool
}

func NewMetricsService(db *pgxpool.Pool) *MetricsService {
	return &MetricsService{DB: db}
}

// GetWaitTimeAccuracy compara tiempos estimados vs reales
type WaitTimeAccuracy struct {
	EstimatedWaitTime int
	ActualWaitTime    int
	Difference        int // negativo = se entregó antes, positivo = se entregó después
	IsAccurate        bool
}

// GetPreparedOrdersMetrics obtiene información de órdenes completadas
type PreparedOrderMetric struct {
	OrderID             int
	RestaurantID        int
	ItemCount           int
	PreparedTimeMinutes int
	CreatedAt           time.Time
	CompletedAt         time.Time
	WasPeakHour         bool
}

// RecordOrderStatus registra cuando una orden cambia de estado
// Se llama cuando se actualiza el status de una orden
func (m *MetricsService) OnOrderStatusUpdate(
	ctx context.Context,
	restaurantID int,
	orderID int,
	newStatus string,
	createdAt time.Time,
) error {
	if newStatus == "COMPLETADA" || newStatus == "PAGADO" {
		// Calcular tiempo real de preparación
		completedAt := time.Now()
		preparedTime := int(completedAt.Sub(createdAt).Minutes())

		// Obtener configuración para saber si fue hora pico
		calc := NewCalculator(m.DB)
		config, err := calc.GetConfig(ctx, restaurantID)
		if err != nil {
			return err
		}

		isPeak := calc.isPeakHour(config, createdAt)

		// Registrar en order_metrics
		sql := `
			INSERT INTO order_metrics (restaurant_id, order_id, item_count, prepared_time_minutes, queue_position, was_peak_hour)
			SELECT $1, id, 
				COALESCE((SELECT COUNT(*) FROM order_details WHERE order_id = $2), 0),
				$3, 0, $4
			FROM orders WHERE id = $2
		`

		_, err = m.DB.Exec(ctx, sql, restaurantID, orderID, preparedTime, isPeak)
		if err != nil {
			return fmt.Errorf("error registrando métrica: %w", err)
		}

		// Actualizar la tabla orders con el tiempo real
		updateSQL := `
			UPDATE orders
			SET completed_at = NOW(), actual_wait_time = $1
			WHERE id = $2
		`

		_, err = m.DB.Exec(ctx, updateSQL, preparedTime, orderID)
		if err != nil {
			return fmt.Errorf("error actualizando orden: %w", err)
		}

		// Actualizar promedio de tiempos
		err = calc.UpdateAveragePrepTime(ctx, restaurantID)
		if err != nil {
			fmt.Printf("Advertencia: error actualizando promedio de tiempos: %v\n", err)
			// No fallar si esto falla, es no-crítico
		}
	}

	return nil
}

// GetRecentMetrics obtiene las métricas de las últimas N órdenes
func (m *MetricsService) GetRecentMetrics(ctx context.Context, restaurantID int, limit int) ([]PreparedOrderMetric, error) {
	sql := `
		SELECT 
			om.order_id,
			om.restaurant_id,
			om.item_count,
			om.prepared_time_minutes,
			om.created_at,
			COALESCE(o.completed_at, om.created_at) as completed_at,
			om.was_peak_hour
		FROM order_metrics om
		LEFT JOIN orders o ON om.order_id = o.id
		WHERE om.restaurant_id = $1
		ORDER BY om.created_at DESC
		LIMIT $2
	`

	rows, err := m.DB.Query(ctx, sql, restaurantID, limit)
	if err != nil {
		return nil, fmt.Errorf("error obteniendo métricas: %w", err)
	}
	defer rows.Close()

	var metrics []PreparedOrderMetric
	for rows.Next() {
		var metric PreparedOrderMetric
		err := rows.Scan(
			&metric.OrderID,
			&metric.RestaurantID,
			&metric.ItemCount,
			&metric.PreparedTimeMinutes,
			&metric.CreatedAt,
			&metric.CompletedAt,
			&metric.WasPeakHour,
		)
		if err != nil {
			return nil, err
		}
		metrics = append(metrics, metric)
	}

	return metrics, nil
}

// GetAverageWaitTimeByHour obtiene el promedio de espera por hora del día
type HourlyWaitTime struct {
	Hour            int
	AverageWaitTime int
	OrderCount      int
}

func (m *MetricsService) GetAverageWaitTimeByHour(ctx context.Context, restaurantID int) ([]HourlyWaitTime, error) {
	sql := `
		SELECT 
			EXTRACT(HOUR FROM om.created_at)::INT as hour,
			COALESCE(AVG(om.prepared_time_minutes)::INT, 0) as avg_wait_time,
			COUNT(*) as order_count
		FROM order_metrics om
		WHERE om.restaurant_id = $1 AND om.created_at > NOW() - INTERVAL '7 days'
		GROUP BY EXTRACT(HOUR FROM om.created_at)
		ORDER BY hour
	`

	rows, err := m.DB.Query(ctx, sql, restaurantID)
	if err != nil {
		return nil, fmt.Errorf("error obteniendo promedios por hora: %w", err)
	}
	defer rows.Close()

	var hourly []HourlyWaitTime
	for rows.Next() {
		var h HourlyWaitTime
		err := rows.Scan(&h.Hour, &h.AverageWaitTime, &h.OrderCount)
		if err != nil {
			return nil, err
		}
		hourly = append(hourly, h)
	}

	return hourly, nil
}

// GetPeakHourAnalysis obtiene análisis de horas pico vs normales
type PeakHourAnalysis struct {
	PeakHourAverage    int
	NonPeakHourAverage int
	PeakOrderCount     int
	NonPeakOrderCount  int
}

func (m *MetricsService) GetPeakHourAnalysis(ctx context.Context, restaurantID int) (*PeakHourAnalysis, error) {
	sql := `
		SELECT 
			COALESCE(AVG(CASE WHEN was_peak_hour THEN prepared_time_minutes END)::INT, 0) as peak_avg,
			COALESCE(AVG(CASE WHEN NOT was_peak_hour THEN prepared_time_minutes END)::INT, 0) as non_peak_avg,
			COALESCE(SUM(CASE WHEN was_peak_hour THEN 1 ELSE 0 END), 0) as peak_count,
			COALESCE(SUM(CASE WHEN NOT was_peak_hour THEN 1 ELSE 0 END), 0) as non_peak_count
		FROM order_metrics
		WHERE restaurant_id = $1
	`

	var analysis PeakHourAnalysis
	err := m.DB.QueryRow(ctx, sql, restaurantID).Scan(
		&analysis.PeakHourAverage,
		&analysis.NonPeakHourAverage,
		&analysis.PeakOrderCount,
		&analysis.NonPeakOrderCount,
	)

	if err != nil {
		return nil, fmt.Errorf("error analizando horas pico: %w", err)
	}

	return &analysis, nil
}
