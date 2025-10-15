package main

import (
	"flag"
	"log"
	"os"
	"os/signal"
	"syscall"

	"monitoring-replication/internal/config"
	"monitoring-replication/internal/monitor"
	"monitoring-replication/internal/server"
)

func main() {
	configFile := flag.String("config", "config.yaml", "Path to configuration file")
	flag.Parse()

	// Load configuration
	cfg, err := config.Load(*configFile)
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	log.Printf("Configuration loaded successfully")
	log.Printf("Monitoring %d databases", len(cfg.Databases))

	// Initialize monitor
	mon, err := monitor.New(cfg)
	if err != nil {
		log.Fatalf("Failed to initialize monitor: %v", err)
	}
	defer mon.Close()

	log.Printf("Monitor initialized successfully")

	// Test initial snapshot
	snapshot, err := mon.GetSnapshot()
	if err != nil {
		log.Printf("Warning: Failed to get initial snapshot: %v", err)
	} else {
		log.Printf("Initial snapshot collected:")
		log.Printf("  - Publications: %d", snapshot.Summary.TotalPublications)
		log.Printf("  - Subscriptions: %d", snapshot.Summary.TotalSubscriptions)
		log.Printf("  - Replication Slots: %d (Active: %d)", 
			snapshot.Summary.TotalSlots, snapshot.Summary.ActiveSlots)
		log.Printf("  - Health Status: %s", snapshot.Summary.HealthStatus)
	}

	// Initialize and start server
	srv := server.New(cfg, mon)

	// Handle graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)

	go func() {
		<-sigChan
		log.Println("Shutting down gracefully...")
		mon.Close()
		os.Exit(0)
	}()

	// Start server
	if err := srv.Start(); err != nil {
		log.Fatalf("Server error: %v", err)
	}
}
