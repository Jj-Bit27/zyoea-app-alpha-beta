package websocket // o el paquete donde lo vayas a poner

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

// Client representa a un frontend conectado
type Client struct {
	Conn         *websocket.Conn
	RestaurantID string
}

// OrderHub administra las conexiones agrupadas por restaurante
type OrderHub struct {
	// Un mapa donde la llave es el ID del restaurante,
	// y el valor es un mapa de los clientes conectados a ese restaurante.
	Rooms map[string]map[*Client]bool
	mu    sync.RWMutex // Para evitar que el servidor colapse si dos se conectan al mismo tiempo
}

// NewHub crea el administrador vacío
func NewHub() *OrderHub {
	return &OrderHub{
		Rooms: make(map[string]map[*Client]bool),
	}
}

// BroadcastToRestaurant envía una orden solo a los clientes de ese local específico
func (h *OrderHub) BroadcastToRestaurant(restaurantID string, newOrder interface{}) {
	h.mu.RLock()
	clients, exists := h.Rooms[restaurantID]
	h.mu.RUnlock()

	if !exists {
		return // Nadie de este restaurante está conectado mirando la pantalla ahorita
	}

	// Convertimos la orden de Go a texto JSON
	message, _ := json.Marshal(newOrder)

	h.mu.Lock()
	defer h.mu.Unlock()
	for client := range clients {
		err := client.Conn.WriteMessage(websocket.TextMessage, message)
		if err != nil {
			// Si falla, es porque cerró la pestaña, lo desconectamos
			client.Conn.Close()
			delete(clients, client)
		}
	}
}

func (h *OrderHub) HandleConnection(w http.ResponseWriter, r *http.Request) {
	// 1. Obtenemos el ID del restaurante desde la URL
	restID := r.URL.Query().Get("restaurantId")
	if restID == "" {
		http.Error(w, "Se requiere el ID del restaurante", http.StatusBadRequest)
		return
	}

	// 2. Convertimos a WebSocket
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("Error de upgrade:", err)
		return
	}

	// 3. Creamos el cliente
	client := &Client{Conn: conn, RestaurantID: restID}

	// 4. Lo registramos en la sala de su restaurante
	h.mu.Lock()
	if h.Rooms[restID] == nil {
		h.Rooms[restID] = make(map[*Client]bool)
	}
	h.Rooms[restID][client] = true
	h.mu.Unlock()

	log.Printf("Nuevo cliente conectado al restaurante %s", restID)

	// 5. Mantenemos la conexión viva esperando desconexión
	defer func() {
		h.mu.Lock()
		delete(h.Rooms[restID], client)
		if len(h.Rooms[restID]) == 0 {
			delete(h.Rooms, restID) // Borramos la sala si quedó vacía
		}
		h.mu.Unlock()
		conn.Close()
		log.Printf("Cliente desconectado del restaurante %s", restID)
	}()

	// Bucle infinito para escuchar (obligatorio para que la conexión no se cierre sola)
	for {
		if _, _, err := conn.ReadMessage(); err != nil {
			break
		}
	}
}
