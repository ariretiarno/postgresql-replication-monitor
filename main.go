package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

type DatabaseConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	DBName   string
	SSLMode  string
}

type ReplicationSlot struct {
	SlotName     string  `json:"slot_name"`
	Plugin       string  `json:"plugin"`
	SlotType     string  `json:"slot_type"`
	Database     string  `json:"database"`
	Active       bool    `json:"active"`
	RestartLSN   *string `json:"restart_lsn"`
	ConfirmedLSN *string `json:"confirmed_flush_lsn"`
	WALStatus    string  `json:"wal_status"`
	SafeWALSize  *int64  `json:"safe_wal_size"`
}

type Publication struct {
	PubName    string `json:"pubname"`
	Owner      string `json:"owner"`
	AllTables  bool   `json:"alltables"`
	Insert     bool   `json:"insert"`
	Update     bool   `json:"update"`
	Delete     bool   `json:"delete"`
	Truncate   bool   `json:"truncate"`
	TableCount int    `json:"table_count"`
}

type Subscription struct {
	SubName    string  `json:"subname"`
	Owner      string  `json:"owner"`
	Enabled    bool    `json:"enabled"`
	Publication string `json:"publication"`
	ConnInfo   string  `json:"conninfo"`
	SlotName   *string `json:"slot_name"`
	SyncCommit string  `json:"synchronous_commit"`
}

type ReplicationStats struct {
	ApplicationName string  `json:"application_name"`
	ClientAddr      *string `json:"client_addr"`
	State           string  `json:"state"`
	SentLSN         *string `json:"sent_lsn"`
	WriteLSN        *string `json:"write_lsn"`
	FlushLSN        *string `json:"flush_lsn"`
	ReplayLSN       *string `json:"replay_lsn"`
	WriteLag        *string `json:"write_lag"`
	FlushLag        *string `json:"flush_lag"`
	ReplayLag       *string `json:"replay_lag"`
	SyncState       string  `json:"sync_state"`
	BackendStart    string  `json:"backend_start"`
}

type LSNInfo struct {
	CurrentLSN      string `json:"current_lsn"`
	CurrentLSNBytes int64  `json:"current_lsn_bytes"`
	WALPosition     string `json:"wal_position"`
}

type DatabaseInfo struct {
	Name string `json:"name"`
	Size string `json:"size"`
}

type DatabaseDetail struct {
	Name              string `json:"name"`
	Size              string `json:"size"`
	HasPublication    bool   `json:"has_publication"`
	HasSubscription   bool   `json:"has_subscription"`
	PublicationCount  int    `json:"publication_count"`
	SubscriptionCount int    `json:"subscription_count"`
	SlotCount         int    `json:"slot_count"`
	ActiveSlots       int    `json:"active_slots"`
}

type MonitoringSummary struct {
	SourceDB          string  `json:"source_db"`
	TargetDB          string  `json:"target_db"`
	TotalDatabases    int     `json:"total_databases"`
	PublicationCount  int     `json:"publication_count"`
	SubscriptionCount int     `json:"subscription_count"`
	SlotCount         int     `json:"slot_count"`
	ActiveSlots       int     `json:"active_slots"`
	MaxReplayLag      *string `json:"max_replay_lag"`
	MaxFlushLag       *string `json:"max_flush_lag"`
	MaxWriteLag       *string `json:"max_write_lag"`
	HealthStatus      string  `json:"health_status"`
	Timestamp         string  `json:"timestamp"`
}

type DiscrepancyCheck struct {
	Database       string `json:"database"`
	TableName      string `json:"table_name"`
	SourceCount    int64  `json:"source_count"`
	TargetCount    int64  `json:"target_count"`
	Discrepancy    int64  `json:"discrepancy"`
	HasDiscrepancy bool   `json:"has_discrepancy"`
}

var (
	sourceDB *sql.DB
	targetDB *sql.DB
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	var err error
	sourceDB, err = initDB(DatabaseConfig{
		Host:     getEnv("SOURCE_DB_HOST", "localhost"),
		Port:     getEnv("SOURCE_DB_PORT", "5432"),
		User:     getEnv("SOURCE_DB_USER", "postgres"),
		Password: getEnv("SOURCE_DB_PASSWORD", ""),
		DBName:   getEnv("SOURCE_DB_NAME", "postgres"),
		SSLMode:  getEnv("SOURCE_DB_SSLMODE", "disable"),
	})
	if err != nil {
		log.Fatalf("Failed to connect to source database: %v", err)
	}
	defer sourceDB.Close()

	targetDB, err = initDB(DatabaseConfig{
		Host:     getEnv("TARGET_DB_HOST", "localhost"),
		Port:     getEnv("TARGET_DB_PORT", "5433"),
		User:     getEnv("TARGET_DB_USER", "postgres"),
		Password: getEnv("TARGET_DB_PASSWORD", ""),
		DBName:   getEnv("TARGET_DB_NAME", "postgres"),
		SSLMode:  getEnv("TARGET_DB_SSLMODE", "require"),
	})
	if err != nil {
		log.Fatalf("Failed to connect to target database: %v", err)
	}
	defer targetDB.Close()

	http.HandleFunc("/", serveIndex)
	http.HandleFunc("/static/", serveStatic)
	http.HandleFunc("/api/health", healthCheck)
	http.HandleFunc("/api/summary", getMonitoringSummary)
	http.HandleFunc("/api/lsn/source", getSourceLSN)
	http.HandleFunc("/api/lsn/target", getTargetLSN)
	http.HandleFunc("/api/publications", getPublications)
	http.HandleFunc("/api/subscriptions", getSubscriptions)
	http.HandleFunc("/api/replication-slots", getReplicationSlots)
	http.HandleFunc("/api/replication-stats", getReplicationStats)
	http.HandleFunc("/api/databases", getDatabases)
	http.HandleFunc("/api/databases/details", getDatabaseDetails)
	http.HandleFunc("/api/discrepancy-check", checkDiscrepancy)

	port := getEnv("SERVER_PORT", "8080")
	log.Printf("Server starting on http://localhost:%s", port)
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

func initDB(config DatabaseConfig) (*sql.DB, error) {
	connStr := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		config.Host, config.Port, config.User, config.Password, config.DBName, config.SSLMode)
	
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		return nil, err
	}

	if err := db.Ping(); err != nil {
		return nil, err
	}

	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(time.Hour)

	return db, nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func serveIndex(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/" {
		http.NotFound(w, r)
		return
	}
	http.ServeFile(w, r, "index.html")
}

func serveStatic(w http.ResponseWriter, r *http.Request) {
	http.StripPrefix("/static/", http.FileServer(http.Dir("static"))).ServeHTTP(w, r)
}

func healthCheck(w http.ResponseWriter, r *http.Request) {
	sourceErr := sourceDB.Ping()
	targetErr := targetDB.Ping()

	status := "healthy"
	if sourceErr != nil || targetErr != nil {
		status = "unhealthy"
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":    status,
		"source_db": sourceErr == nil,
		"target_db": targetErr == nil,
		"timestamp": time.Now().Format(time.RFC3339),
	})
}

func countPublicationsAcrossAllDatabases() int {
	// Count unique replication slots with publications (one per database)
	var count int
	err := sourceDB.QueryRow(`
		SELECT COUNT(DISTINCT database) 
		FROM pg_replication_slots 
		WHERE slot_type = 'logical' AND database IS NOT NULL
	`).Scan(&count)
	
	if err != nil {
		log.Printf("Error counting publications: %v", err)
		return 0
	}
	
	return count
}

func countSubscriptionsAcrossAllDatabases() int {
	// Count unique replication slots (one subscription per database)
	var count int
	err := sourceDB.QueryRow(`
		SELECT COUNT(DISTINCT database) 
		FROM pg_replication_slots 
		WHERE slot_type = 'logical' AND database IS NOT NULL
	`).Scan(&count)
	
	if err != nil {
		log.Printf("Error counting subscriptions: %v", err)
		return 0
	}
	
	return count
}

func getMonitoringSummary(w http.ResponseWriter, r *http.Request) {
	summary := MonitoringSummary{
		SourceDB:  getEnv("SOURCE_DB_HOST", "localhost"),
		TargetDB:  getEnv("TARGET_DB_HOST", "localhost"),
		Timestamp: time.Now().Format(time.RFC3339),
	}

	var dbCount int
	sourceDB.QueryRow("SELECT COUNT(*) FROM pg_database WHERE datistemplate = false").Scan(&dbCount)
	summary.TotalDatabases = dbCount

	// Count publications across all databases
	pubCount := countPublicationsAcrossAllDatabases()
	summary.PublicationCount = pubCount

	// Count subscriptions across all databases
	subCount := countSubscriptionsAcrossAllDatabases()
	summary.SubscriptionCount = subCount

	var slotCount, activeSlots int
	sourceDB.QueryRow("SELECT COUNT(*), COUNT(*) FILTER (WHERE active = true) FROM pg_replication_slots").Scan(&slotCount, &activeSlots)
	summary.SlotCount = slotCount
	summary.ActiveSlots = activeSlots

	var maxReplayLag, maxFlushLag, maxWriteLag sql.NullString
	sourceDB.QueryRow(`
		SELECT 
			MAX(replay_lag)::text,
			MAX(flush_lag)::text,
			MAX(write_lag)::text
		FROM pg_stat_replication
	`).Scan(&maxReplayLag, &maxFlushLag, &maxWriteLag)
	
	if maxReplayLag.Valid {
		summary.MaxReplayLag = &maxReplayLag.String
	}
	if maxFlushLag.Valid {
		summary.MaxFlushLag = &maxFlushLag.String
	}
	if maxWriteLag.Valid {
		summary.MaxWriteLag = &maxWriteLag.String
	}

	summary.HealthStatus = "healthy"
	if summary.ActiveSlots < summary.SlotCount {
		summary.HealthStatus = "warning"
	}
	if summary.ActiveSlots == 0 && summary.SlotCount > 0 {
		summary.HealthStatus = "critical"
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(summary)
}

func getSourceLSN(w http.ResponseWriter, r *http.Request) {
	var lsnInfo LSNInfo
	err := sourceDB.QueryRow(`
		SELECT 
			pg_current_wal_lsn()::text,
			pg_wal_lsn_diff(pg_current_wal_lsn(), '0/0')::bigint,
			pg_current_wal_insert_lsn()::text
	`).Scan(&lsnInfo.CurrentLSN, &lsnInfo.CurrentLSNBytes, &lsnInfo.WALPosition)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(lsnInfo)
}

func getTargetLSN(w http.ResponseWriter, r *http.Request) {
	var lsnInfo LSNInfo
	err := targetDB.QueryRow(`
		SELECT 
			pg_last_wal_receive_lsn()::text,
			COALESCE(pg_wal_lsn_diff(pg_last_wal_receive_lsn(), '0/0'), 0)::bigint,
			pg_last_wal_replay_lsn()::text
	`).Scan(&lsnInfo.CurrentLSN, &lsnInfo.CurrentLSNBytes, &lsnInfo.WALPosition)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(lsnInfo)
}

func getPublications(w http.ResponseWriter, r *http.Request) {
	// Get list of databases with replication slots (these have publications)
	rows, err := sourceDB.Query(`
		SELECT DISTINCT 
			rs.database,
			rs.slot_name,
			rs.active,
			rs.confirmed_flush_lsn::text
		FROM pg_replication_slots rs
		WHERE rs.slot_type = 'logical' AND rs.database IS NOT NULL
		ORDER BY rs.database
	`)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type PubInfo struct {
		Database     string `json:"database"`
		SlotName     string `json:"slot_name"`
		Active       bool   `json:"active"`
		ConfirmedLSN string `json:"confirmed_lsn"`
	}

	var publications []PubInfo
	for rows.Next() {
		var pub PubInfo
		rows.Scan(&pub.Database, &pub.SlotName, &pub.Active, &pub.ConfirmedLSN)
		publications = append(publications, pub)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(publications)
}

func getSubscriptions(w http.ResponseWriter, r *http.Request) {
	// Get list of databases with replication slots (these have subscriptions)
	rows, err := sourceDB.Query(`
		SELECT DISTINCT 
			rs.database,
			rs.slot_name,
			rs.active,
			rs.restart_lsn::text
		FROM pg_replication_slots rs
		WHERE rs.slot_type = 'logical' AND rs.database IS NOT NULL
		ORDER BY rs.database
	`)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type SubInfo struct {
		Database   string `json:"database"`
		SlotName   string `json:"slot_name"`
		Active     bool   `json:"active"`
		RestartLSN string `json:"restart_lsn"`
	}

	var subscriptions []SubInfo
	for rows.Next() {
		var sub SubInfo
		rows.Scan(&sub.Database, &sub.SlotName, &sub.Active, &sub.RestartLSN)
		subscriptions = append(subscriptions, sub)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(subscriptions)
}

func getReplicationSlots(w http.ResponseWriter, r *http.Request) {
	rows, err := sourceDB.Query(`
		SELECT 
			slot_name,
			plugin,
			slot_type,
			database,
			active,
			restart_lsn::text,
			confirmed_flush_lsn::text,
			wal_status,
			safe_wal_size
		FROM pg_replication_slots
		ORDER BY slot_name
	`)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var slots []ReplicationSlot
	for rows.Next() {
		var slot ReplicationSlot
		rows.Scan(&slot.SlotName, &slot.Plugin, &slot.SlotType, &slot.Database, &slot.Active, &slot.RestartLSN, &slot.ConfirmedLSN, &slot.WALStatus, &slot.SafeWALSize)
		slots = append(slots, slot)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(slots)
}

func getReplicationStats(w http.ResponseWriter, r *http.Request) {
	rows, err := sourceDB.Query(`
		SELECT 
			application_name,
			client_addr::text,
			state,
			sent_lsn::text,
			write_lsn::text,
			flush_lsn::text,
			replay_lsn::text,
			write_lag::text,
			flush_lag::text,
			replay_lag::text,
			sync_state,
			backend_start::text
		FROM pg_stat_replication
		ORDER BY application_name
	`)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var stats []ReplicationStats
	for rows.Next() {
		var stat ReplicationStats
		rows.Scan(&stat.ApplicationName, &stat.ClientAddr, &stat.State, &stat.SentLSN, &stat.WriteLSN, &stat.FlushLSN, &stat.ReplayLSN, &stat.WriteLag, &stat.FlushLag, &stat.ReplayLag, &stat.SyncState, &stat.BackendStart)
		stats = append(stats, stat)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

func getDatabases(w http.ResponseWriter, r *http.Request) {
	rows, err := sourceDB.Query(`
		SELECT 
			datname,
			pg_size_pretty(pg_database_size(datname))
		FROM pg_database
		WHERE datistemplate = false
		ORDER BY datname
	`)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var databases []DatabaseInfo
	for rows.Next() {
		var db DatabaseInfo
		rows.Scan(&db.Name, &db.Size)
		databases = append(databases, db)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(databases)
}

func getDatabaseDetails(w http.ResponseWriter, r *http.Request) {
	// Get all databases
	rows, err := sourceDB.Query(`
		SELECT 
			datname,
			pg_size_pretty(pg_database_size(datname))
		FROM pg_database
		WHERE datistemplate = false
		ORDER BY datname
	`)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var details []DatabaseDetail
	for rows.Next() {
		var detail DatabaseDetail
		rows.Scan(&detail.Name, &detail.Size)
		details = append(details, detail)
	}

	// Get all replication slots in one query
	slotRows, err := sourceDB.Query(`
		SELECT 
			database,
			COUNT(*),
			COUNT(*) FILTER (WHERE active = true)
		FROM pg_replication_slots
		WHERE database IS NOT NULL
		GROUP BY database
	`)
	if err == nil {
		defer slotRows.Close()
		slotMap := make(map[string]struct{ total, active int })
		for slotRows.Next() {
			var dbName string
			var total, active int
			slotRows.Scan(&dbName, &total, &active)
			slotMap[dbName] = struct{ total, active int }{total, active}
		}
		
		// Apply slot data to details
		for i := range details {
			if slots, ok := slotMap[details[i].Name]; ok {
				details[i].SlotCount = slots.total
				details[i].ActiveSlots = slots.active
			}
		}
	}

	// Get publication count (global, not per-database for logical replication)
	var pubCount int
	sourceDB.QueryRow("SELECT COUNT(*) FROM pg_publication").Scan(&pubCount)
	
	// Get subscription count (global)
	var subCount int
	targetDB.QueryRow("SELECT COUNT(*) FROM pg_subscription").Scan(&subCount)
	
	// Apply to all databases that have slots
	for i := range details {
		if details[i].SlotCount > 0 {
			details[i].PublicationCount = pubCount
			details[i].HasPublication = pubCount > 0
			details[i].SubscriptionCount = subCount
			details[i].HasSubscription = subCount > 0
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(details)
}

func checkDiscrepancy(w http.ResponseWriter, r *http.Request) {
	var request struct {
		Database string   `json:"database"`
		Tables   []string `json:"tables"`
	}

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	var results []DiscrepancyCheck

	for _, table := range request.Tables {
		var sourceCount, targetCount int64

		sourceConnStr := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
			getEnv("SOURCE_DB_HOST", "localhost"),
			getEnv("SOURCE_DB_PORT", "5432"),
			getEnv("SOURCE_DB_USER", "postgres"),
			getEnv("SOURCE_DB_PASSWORD", ""),
			request.Database,
			getEnv("SOURCE_DB_SSLMODE", "disable"))
		
		sourceConn, err := sql.Open("postgres", sourceConnStr)
		if err == nil {
			defer sourceConn.Close()
			sourceConn.QueryRow(fmt.Sprintf("SELECT COUNT(*) FROM %s", table)).Scan(&sourceCount)
		}

		targetConnStr := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
			getEnv("TARGET_DB_HOST", "localhost"),
			getEnv("TARGET_DB_PORT", "5433"),
			getEnv("TARGET_DB_USER", "postgres"),
			getEnv("TARGET_DB_PASSWORD", ""),
			request.Database,
			getEnv("TARGET_DB_SSLMODE", "require"))
		
		targetConn, err := sql.Open("postgres", targetConnStr)
		if err == nil {
			defer targetConn.Close()
			targetConn.QueryRow(fmt.Sprintf("SELECT COUNT(*) FROM %s", table)).Scan(&targetCount)
		}

		discrepancy := sourceCount - targetCount
		results = append(results, DiscrepancyCheck{
			Database:       request.Database,
			TableName:      table,
			SourceCount:    sourceCount,
			TargetCount:    targetCount,
			Discrepancy:    discrepancy,
			HasDiscrepancy: discrepancy != 0,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(results)
}
