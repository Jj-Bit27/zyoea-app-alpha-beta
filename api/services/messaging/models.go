package messaging

import "time"

type OrderEvent struct {
	Type         string    `json:"type"`
	OrderID      string    `json:"orderId"`
	RestaurantID int       `json:"restaurantId"`
	Status       string    `json:"status"`
	Timestamp    time.Time `json:"timestamp"`
}

type NotificationEvent struct {
	Type    string `json:"type"`
	UserID  string `json:"userId"`
	Title   string `json:"title"`
	Message string `json:"message"`
}
