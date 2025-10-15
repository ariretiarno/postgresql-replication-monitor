package server

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
	"monitoring-replication/internal/config"
	"monitoring-replication/internal/monitor"
)

type Server struct {
	config    *config.Config
	monitor   *monitor.Monitor
	router    *mux.Router
	upgrader  websocket.Upgrader
	clients   map[*websocket.Conn]bool
	clientsMu sync.RWMutex
	broadcast chan *monitor.MonitoringSnapshot
}

func New(cfg *config.Config, mon *monitor.Monitor) *Server {
	s := &Server{
		config:  cfg,
		monitor: mon,
		router:  mux.NewRouter(),
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				return true // Allow all origins for development
			},
		},
		clients:   make(map[*websocket.Conn]bool),
		broadcast: make(chan *monitor.MonitoringSnapshot, 10),
	}

	s.setupRoutes()
	return s
}

func (s *Server) setupRoutes() {
	// API routes
	s.router.HandleFunc("/api/snapshot", s.handleSnapshot).Methods("GET")
	s.router.HandleFunc("/api/ws", s.handleWebSocket)

	// Static files
	s.router.HandleFunc("/", s.handleIndex).Methods("GET")
	s.router.PathPrefix("/static/").Handler(http.StripPrefix("/static/", http.FileServer(http.Dir("web/static"))))
}

func (s *Server) handleSnapshot(w http.ResponseWriter, r *http.Request) {
	snapshot, err := s.monitor.GetSnapshot()
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to get snapshot: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(snapshot)
}

func (s *Server) handleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := s.upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}

	s.clientsMu.Lock()
	s.clients[conn] = true
	s.clientsMu.Unlock()

	log.Printf("New WebSocket client connected. Total clients: %d", len(s.clients))

	// Send initial snapshot
	snapshot, err := s.monitor.GetSnapshot()
	if err == nil {
		conn.WriteJSON(snapshot)
	}

	// Handle client disconnection
	defer func() {
		s.clientsMu.Lock()
		delete(s.clients, conn)
		s.clientsMu.Unlock()
		conn.Close()
		log.Printf("WebSocket client disconnected. Total clients: %d", len(s.clients))
	}()

	// Keep connection alive and handle incoming messages
	for {
		_, _, err := conn.ReadMessage()
		if err != nil {
			break
		}
	}
}

func (s *Server) handleIndex(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "web/index.html")
}

func (s *Server) Start() error {
	// Start broadcasting updates
	go s.startBroadcasting()

	addr := fmt.Sprintf(":%d", s.config.Server.Port)
	log.Printf("Starting server on %s", addr)
	log.Printf("Dashboard available at http://localhost%s", addr)

	return http.ListenAndServe(addr, s.router)
}

func (s *Server) startBroadcasting() {
	ticker := time.NewTicker(time.Duration(s.config.Server.RefreshInterval) * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		snapshot, err := s.monitor.GetSnapshot()
		if err != nil {
			log.Printf("Error getting snapshot: %v", err)
			continue
		}

		s.clientsMu.RLock()
		for client := range s.clients {
			err := client.WriteJSON(snapshot)
			if err != nil {
				log.Printf("Error writing to client: %v", err)
				client.Close()
				s.clientsMu.RUnlock()
				s.clientsMu.Lock()
				delete(s.clients, client)
				s.clientsMu.Unlock()
				s.clientsMu.RLock()
			}
		}
		s.clientsMu.RUnlock()
	}
}
