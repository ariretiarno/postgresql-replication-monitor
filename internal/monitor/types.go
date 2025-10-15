package monitor

import "time"

// ReplicationSlot represents a logical replication slot on the source database
type ReplicationSlot struct {
	SlotName           string    `json:"slot_name"`
	Plugin             string    `json:"plugin"`
	SlotType           string    `json:"slot_type"`
	Database           string    `json:"database"`
	Active             bool      `json:"active"`
	RestartLSN         string    `json:"restart_lsn"`
	ConfirmedFlushLSN  string    `json:"confirmed_flush_lsn"`
	WALStatus          string    `json:"wal_status"`
	SafeWALSize        *int64    `json:"safe_wal_size"`
	LastUpdated        time.Time `json:"last_updated"`
}

// Publication represents a publication on the source database
type Publication struct {
	PubName    string   `json:"pub_name"`
	PubOwner   string   `json:"pub_owner"`
	AllTables  bool     `json:"all_tables"`
	PubInsert  bool     `json:"pub_insert"`
	PubUpdate  bool     `json:"pub_update"`
	PubDelete  bool     `json:"pub_delete"`
	PubTruncate bool    `json:"pub_truncate"`
	TableCount int      `json:"table_count"`
	Tables     []string `json:"tables"`
}

// Subscription represents a subscription on the target database
type Subscription struct {
	SubName        string    `json:"sub_name"`
	SubOwner       string    `json:"sub_owner"`
	Enabled        bool      `json:"enabled"`
	Publication    string    `json:"publication"`
	ConnInfo       string    `json:"conn_info"`
	SlotName       string    `json:"slot_name"`
	SyncCommit     string    `json:"sync_commit"`
	LastUpdated    time.Time `json:"last_updated"`
}

// ReplicationStats represents replication statistics
type ReplicationStats struct {
	SlotName          string    `json:"slot_name"`
	CurrentWALLSN     string    `json:"current_wal_lsn"`
	ConfirmedFlushLSN string    `json:"confirmed_flush_lsn"`
	LSNDistance       int64     `json:"lsn_distance"`
	LSNDistanceBytes  int64     `json:"lsn_distance_bytes"`
	ReplicationLagSec *float64  `json:"replication_lag_sec"`
	Active            bool      `json:"active"`
	LastUpdated       time.Time `json:"last_updated"`
}

// SubscriptionStats represents subscription statistics on the target
type SubscriptionStats struct {
	SubName           string    `json:"sub_name"`
	ReceivedLSN       string    `json:"received_lsn"`
	LastMsgSendTime   *time.Time `json:"last_msg_send_time"`
	LastMsgReceiptTime *time.Time `json:"last_msg_receipt_time"`
	LatestEndLSN      string    `json:"latest_end_lsn"`
	LatestEndTime     *time.Time `json:"latest_end_time"`
	LastUpdated       time.Time `json:"last_updated"`
}

// DatabaseStatus represents the overall status of a database
type DatabaseStatus struct {
	Name              string                       `json:"name"`
	Role              string                       `json:"role"`
	Connected         bool                         `json:"connected"`
	WALLevel          string                       `json:"wal_level"`
	LogicalReplication string                      `json:"logical_replication"`
	CurrentLSN        string                       `json:"current_lsn"`
	Publications      []Publication                `json:"publications,omitempty"`
	Subscriptions     []Subscription               `json:"subscriptions,omitempty"`
	ReplicationSlots  []ReplicationSlot            `json:"replication_slots,omitempty"`
	ReplicationStats  []ReplicationStats           `json:"replication_stats,omitempty"`
	SubscriptionStats []SubscriptionStats          `json:"subscription_stats,omitempty"`
	LastUpdated       time.Time                    `json:"last_updated"`
	Error             string                       `json:"error,omitempty"`
}

// MonitoringSnapshot represents a complete snapshot of all databases
type MonitoringSnapshot struct {
	Timestamp time.Time        `json:"timestamp"`
	Databases []DatabaseStatus `json:"databases"`
	Summary   Summary          `json:"summary"`
}

// Summary provides an overview of the replication status
type Summary struct {
	TotalPublications  int     `json:"total_publications"`
	TotalSubscriptions int     `json:"total_subscriptions"`
	TotalSlots         int     `json:"total_slots"`
	ActiveSlots        int     `json:"active_slots"`
	MaxLagBytes        int64   `json:"max_lag_bytes"`
	MaxLagSeconds      float64 `json:"max_lag_seconds"`
	HealthStatus       string  `json:"health_status"` // "healthy", "warning", "critical"
	Issues             []string `json:"issues,omitempty"`
}
