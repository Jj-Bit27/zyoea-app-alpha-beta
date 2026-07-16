package websocket

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
	"github.com/redis/go-redis/v9"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

type Client struct {
	Conn         *websocket.Conn
	RestaurantID string
}

type OrderHub struct {
	Rooms map[string]map[*Client]bool
	mu    sync.RWMutex

	rdb        *redis.Client
	pubsub     *redis.PubSub
	subscribed map[string]bool
	subMu      sync.Mutex
}

func NewHub() *OrderHub {
	return &OrderHub{
		Rooms:      make(map[string]map[*Client]bool),
		subscribed: make(map[string]bool),
	}
}

func NewHubWithRedis(rdb *redis.Client) *OrderHub {
	h := NewHub()
	h.rdb = rdb
	if rdb != nil {
		h.pubsub = rdb.Subscribe(context.Background())
		go h.redisListener()
	}
	return h
}

func (h *OrderHub) BroadcastToRestaurant(restaurantID string, newOrder interface{}) {
	h.mu.RLock()
	clients, exists := h.Rooms[restaurantID]
	h.mu.RUnlock()

	message, _ := json.Marshal(newOrder)

	if exists {
		h.mu.Lock()
		for client := range clients {
			err := client.Conn.WriteMessage(websocket.TextMessage, message)
			if err != nil {
				client.Conn.Close()
				delete(clients, client)
			}
		}
		h.mu.Unlock()
	}

	if h.rdb != nil {
		channel := "orders:" + restaurantID
		if err := h.rdb.Publish(context.Background(), channel, string(message)).Err(); err != nil {
			log.Printf("Error publicando en Redis Pub/Sub: %v", err)
		}
	}
}

func (h *OrderHub) redisListener() {
	if h.pubsub == nil {
		return
	}

	ch := h.pubsub.Channel()
	for msg := range ch {
		if len(msg.Channel) > 7 {
			restID := msg.Channel[7:]

			h.mu.RLock()
			clients, exists := h.Rooms[restID]
			h.mu.RUnlock()

			if exists {
				h.mu.Lock()
				for client := range clients {
					err := client.Conn.WriteMessage(websocket.TextMessage, []byte(msg.Payload))
					if err != nil {
						client.Conn.Close()
						delete(clients, client)
					}
				}
				h.mu.Unlock()
			}
		}
	}
}

func (h *OrderHub) SubscribeToRestaurant(restaurantID string) {
	if h.pubsub == nil {
		return
	}

	h.subMu.Lock()
	defer h.subMu.Unlock()

	if !h.subscribed[restaurantID] {
		channel := "orders:" + restaurantID
		if err := h.pubsub.Subscribe(context.Background(), channel); err != nil {
			log.Printf("Error suscribiendo a Redis channel %s: %v", channel, err)
			return
		}
		h.subscribed[restaurantID] = true
	}
}

func (h *OrderHub) UnsubscribeFromRestaurant(restaurantID string) {
	if h.pubsub == nil {
		return
	}

	h.subMu.Lock()
	defer h.subMu.Unlock()

	if h.subscribed[restaurantID] {
		channel := "orders:" + restaurantID
		if err := h.pubsub.Unsubscribe(context.Background(), channel); err != nil {
			log.Printf("Error desuscribiendo de Redis channel %s: %v", channel, err)
		}
		delete(h.subscribed, restaurantID)
	}
}

func (h *OrderHub) HandleConnection(w http.ResponseWriter, r *http.Request) {
	restID := r.URL.Query().Get("restaurantId")
	if restID == "" {
		http.Error(w, "Se requiere el ID del restaurante", http.StatusBadRequest)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("Error de upgrade:", err)
		return
	}

	client := &Client{Conn: conn, RestaurantID: restID}

	h.mu.Lock()
	if h.Rooms[restID] == nil {
		h.Rooms[restID] = make(map[*Client]bool)
		h.SubscribeToRestaurant(restID)
	}
	h.Rooms[restID][client] = true
	h.mu.Unlock()

	log.Printf("Nuevo cliente conectado al restaurante %s", restID)

	defer func() {
		h.mu.Lock()
		delete(h.Rooms[restID], client)
		if len(h.Rooms[restID]) == 0 {
			delete(h.Rooms, restID)
			h.UnsubscribeFromRestaurant(restID)
		}
		h.mu.Unlock()
		conn.Close()
		log.Printf("Cliente desconectado del restaurante %s", restID)
	}()

	for {
		if _, _, err := conn.ReadMessage(); err != nil {
			break
		}
	}
}
