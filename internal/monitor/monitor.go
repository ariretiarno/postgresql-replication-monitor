package monitor

import (
	"database/sql"
	"fmt"
	"sync"
	"time"

	_ "github.com/lib/pq"
	"monitoring-replication/internal/config"
)

type Monitor struct {
	config    *config.Config
	databases map[string]*sql.DB
	mu        sync.RWMutex
}

func New(cfg *config.Config) (*Monitor, error) {
	m := &Monitor{
		config:    cfg,
		databases: make(map[string]*sql.DB),
	}

	// Initialize database connections
	for _, dbConfig := range cfg.Databases {
		db, err := sql.Open("postgres", dbConfig.ConnectionString())
		if err != nil {
			return nil, fmt.Errorf("failed to open connection to %s: %w", dbConfig.Name, err)
		}

		// Test connection
		if err := db.Ping(); err != nil {
			return nil, fmt.Errorf("failed to ping database %s: %w", dbConfig.Name, err)
		}

		// Set connection pool settings
		db.SetMaxOpenConns(10)
		db.SetMaxIdleConns(5)
		db.SetConnMaxLifetime(time.Minute * 5)

		m.databases[dbConfig.Name] = db
	}

	return m, nil
}

func (m *Monitor) Close() {
	m.mu.Lock()
	defer m.mu.Unlock()

	for _, db := range m.databases {
		db.Close()
	}
}

func (m *Monitor) GetSnapshot() (*MonitoringSnapshot, error) {
	snapshot := &MonitoringSnapshot{
		Timestamp: time.Now(),
		Databases: make([]DatabaseStatus, 0, len(m.config.Databases)),
	}

	var wg sync.WaitGroup
	statusChan := make(chan DatabaseStatus, len(m.config.Databases))

	// Collect data from all databases in parallel
	for _, dbConfig := range m.config.Databases {
		wg.Add(1)
		go func(cfg config.Database) {
			defer wg.Done()
			status := m.getDatabaseStatus(cfg)
			statusChan <- status
		}(dbConfig)
	}

	// Wait for all goroutines to complete
	go func() {
		wg.Wait()
		close(statusChan)
	}()

	// Collect results
	for status := range statusChan {
		snapshot.Databases = append(snapshot.Databases, status)
	}

	// Calculate summary
	snapshot.Summary = m.calculateSummary(snapshot.Databases)

	return snapshot, nil
}

func (m *Monitor) getDatabaseStatus(dbConfig config.Database) DatabaseStatus {
	status := DatabaseStatus{
		Name:        dbConfig.Name,
		Role:        dbConfig.Role,
		LastUpdated: time.Now(),
	}

	db, ok := m.databases[dbConfig.Name]
	if !ok {
		status.Error = "database connection not found"
		return status
	}

	// Test connection
	if err := db.Ping(); err != nil {
		status.Error = fmt.Sprintf("connection failed: %v", err)
		return status
	}
	status.Connected = true

	// Get WAL level and logical replication settings
	m.getReplicationSettings(db, &status)

	// Get current LSN
	m.getCurrentLSN(db, &status)

	if dbConfig.Role == "source" {
		// Get publications
		status.Publications = m.getPublications(db)

		// Get replication slots
		status.ReplicationSlots = m.getReplicationSlots(db)

		// Get replication stats
		status.ReplicationStats = m.getReplicationStats(db)
	} else if dbConfig.Role == "target" {
		// Get subscriptions
		status.Subscriptions = m.getSubscriptions(db)

		// Get subscription stats
		status.SubscriptionStats = m.getSubscriptionStats(db)
	}

	return status
}

func (m *Monitor) getReplicationSettings(db *sql.DB, status *DatabaseStatus) {
	query := `
		SELECT name, setting 
		FROM pg_settings 
		WHERE name IN ('wal_level', 'rds.logical_replication')
	`

	rows, err := db.Query(query)
	if err != nil {
		status.Error = fmt.Sprintf("failed to get replication settings: %v", err)
		return
	}
	defer rows.Close()

	for rows.Next() {
		var name, setting string
		if err := rows.Scan(&name, &setting); err != nil {
			continue
		}

		if name == "wal_level" {
			status.WALLevel = setting
		} else if name == "rds.logical_replication" {
			status.LogicalReplication = setting
		}
	}
}

func (m *Monitor) getCurrentLSN(db *sql.DB, status *DatabaseStatus) {
	var lsn string
	err := db.QueryRow("SELECT pg_current_wal_lsn()").Scan(&lsn)
	if err != nil {
		status.Error = fmt.Sprintf("failed to get current LSN: %v", err)
		return
	}
	status.CurrentLSN = lsn
}

func (m *Monitor) getPublications(db *sql.DB) []Publication {
	query := `
		SELECT 
			p.pubname,
			r.rolname as pubowner,
			p.puballtables,
			p.pubinsert,
			p.pubupdate,
			p.pubdelete,
			p.pubtruncate
		FROM pg_publication p
		JOIN pg_roles r ON p.pubowner = r.oid
		ORDER BY p.pubname
	`

	rows, err := db.Query(query)
	if err != nil {
		return nil
	}
	defer rows.Close()

	var publications []Publication
	for rows.Next() {
		var pub Publication
		err := rows.Scan(
			&pub.PubName,
			&pub.PubOwner,
			&pub.AllTables,
			&pub.PubInsert,
			&pub.PubUpdate,
			&pub.PubDelete,
			&pub.PubTruncate,
		)
		if err != nil {
			continue
		}

		// Get tables for this publication
		pub.Tables = m.getPublicationTables(db, pub.PubName)
		pub.TableCount = len(pub.Tables)

		publications = append(publications, pub)
	}

	return publications
}

func (m *Monitor) getPublicationTables(db *sql.DB, pubName string) []string {
	query := `
		SELECT schemaname || '.' || tablename as table_name
		FROM pg_publication_tables
		WHERE pubname = $1
		ORDER BY schemaname, tablename
	`

	rows, err := db.Query(query, pubName)
	if err != nil {
		return nil
	}
	defer rows.Close()

	var tables []string
	for rows.Next() {
		var table string
		if err := rows.Scan(&table); err != nil {
			continue
		}
		tables = append(tables, table)
	}

	return tables
}

func (m *Monitor) getReplicationSlots(db *sql.DB) []ReplicationSlot {
	query := `
		SELECT 
			slot_name,
			plugin,
			slot_type,
			database,
			active,
			COALESCE(restart_lsn::text, '') as restart_lsn,
			COALESCE(confirmed_flush_lsn::text, '') as confirmed_flush_lsn,
			COALESCE(wal_status, '') as wal_status,
			safe_wal_size
		FROM pg_replication_slots
		WHERE slot_type = 'logical'
		ORDER BY slot_name
	`

	rows, err := db.Query(query)
	if err != nil {
		return nil
	}
	defer rows.Close()

	var slots []ReplicationSlot
	for rows.Next() {
		var slot ReplicationSlot
		err := rows.Scan(
			&slot.SlotName,
			&slot.Plugin,
			&slot.SlotType,
			&slot.Database,
			&slot.Active,
			&slot.RestartLSN,
			&slot.ConfirmedFlushLSN,
			&slot.WALStatus,
			&slot.SafeWALSize,
		)
		if err != nil {
			continue
		}
		slot.LastUpdated = time.Now()
		slots = append(slots, slot)
	}

	return slots
}

func (m *Monitor) getReplicationStats(db *sql.DB) []ReplicationStats {
	query := `
		SELECT 
			slot_name,
			pg_current_wal_lsn()::text as current_wal_lsn,
			COALESCE(confirmed_flush_lsn::text, '0/0') as confirmed_flush_lsn,
			(pg_current_wal_lsn() - confirmed_flush_lsn) as lsn_distance,
			active
		FROM pg_replication_slots
		WHERE slot_type = 'logical'
		ORDER BY slot_name
	`

	rows, err := db.Query(query)
	if err != nil {
		return nil
	}
	defer rows.Close()

	var stats []ReplicationStats
	for rows.Next() {
		var stat ReplicationStats
		err := rows.Scan(
			&stat.SlotName,
			&stat.CurrentWALLSN,
			&stat.ConfirmedFlushLSN,
			&stat.LSNDistance,
			&stat.Active,
		)
		if err != nil {
			continue
		}
		stat.LSNDistanceBytes = stat.LSNDistance
		stat.LastUpdated = time.Now()

		// Try to get replication lag in seconds
		var lagSec sql.NullFloat64
		lagQuery := `
			SELECT EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp()))
		`
		if err := db.QueryRow(lagQuery).Scan(&lagSec); err == nil && lagSec.Valid {
			stat.ReplicationLagSec = &lagSec.Float64
		}

		stats = append(stats, stat)
	}

	return stats
}

func (m *Monitor) getSubscriptions(db *sql.DB) []Subscription {
	query := `
		SELECT 
			s.subname,
			r.rolname as subowner,
			s.subenabled,
			array_to_string(s.subpublications, ',') as publication,
			s.subconninfo,
			s.subslotname,
			s.subsynccommit
		FROM pg_subscription s
		JOIN pg_roles r ON s.subowner = r.oid
		ORDER BY s.subname
	`

	rows, err := db.Query(query)
	if err != nil {
		return nil
	}
	defer rows.Close()

	var subscriptions []Subscription
	for rows.Next() {
		var sub Subscription
		err := rows.Scan(
			&sub.SubName,
			&sub.SubOwner,
			&sub.Enabled,
			&sub.Publication,
			&sub.ConnInfo,
			&sub.SlotName,
			&sub.SyncCommit,
		)
		if err != nil {
			continue
		}
		sub.LastUpdated = time.Now()
		subscriptions = append(subscriptions, sub)
	}

	return subscriptions
}

func (m *Monitor) getSubscriptionStats(db *sql.DB) []SubscriptionStats {
	query := `
		SELECT 
			s.subname,
			COALESCE(ss.received_lsn::text, '0/0') as received_lsn,
			ss.last_msg_send_time,
			ss.last_msg_receipt_time,
			COALESCE(ss.latest_end_lsn::text, '0/0') as latest_end_lsn,
			ss.latest_end_time
		FROM pg_subscription s
		LEFT JOIN pg_stat_subscription ss ON s.oid = ss.subid
		ORDER BY s.subname
	`

	rows, err := db.Query(query)
	if err != nil {
		return nil
	}
	defer rows.Close()

	var stats []SubscriptionStats
	for rows.Next() {
		var stat SubscriptionStats
		err := rows.Scan(
			&stat.SubName,
			&stat.ReceivedLSN,
			&stat.LastMsgSendTime,
			&stat.LastMsgReceiptTime,
			&stat.LatestEndLSN,
			&stat.LatestEndTime,
		)
		if err != nil {
			continue
		}
		stat.LastUpdated = time.Now()
		stats = append(stats, stat)
	}

	return stats
}

func (m *Monitor) calculateSummary(databases []DatabaseStatus) Summary {
	summary := Summary{
		HealthStatus: "healthy",
	}

	for _, db := range databases {
		summary.TotalPublications += len(db.Publications)
		summary.TotalSubscriptions += len(db.Subscriptions)
		summary.TotalSlots += len(db.ReplicationSlots)

		for _, slot := range db.ReplicationSlots {
			if slot.Active {
				summary.ActiveSlots++
			}
		}

		for _, stat := range db.ReplicationStats {
			if stat.LSNDistanceBytes > summary.MaxLagBytes {
				summary.MaxLagBytes = stat.LSNDistanceBytes
			}

			if stat.ReplicationLagSec != nil && *stat.ReplicationLagSec > summary.MaxLagSeconds {
				summary.MaxLagSeconds = *stat.ReplicationLagSec
			}

			// Check for issues
			if stat.LSNDistanceBytes > m.config.Monitoring.LagThreshold {
				summary.Issues = append(summary.Issues, 
					fmt.Sprintf("High replication lag on slot %s: %d bytes", stat.SlotName, stat.LSNDistanceBytes))
				summary.HealthStatus = "warning"
			}

			if !stat.Active {
				summary.Issues = append(summary.Issues, 
					fmt.Sprintf("Replication slot %s is inactive", stat.SlotName))
				if summary.HealthStatus != "critical" {
					summary.HealthStatus = "warning"
				}
			}
		}

		if !db.Connected {
			summary.Issues = append(summary.Issues, 
				fmt.Sprintf("Database %s is not connected", db.Name))
			summary.HealthStatus = "critical"
		}
	}

	return summary
}
