# PostgreSQL Replication Monitor

A real-time monitoring dashboard for PostgreSQL logical replication, designed to track the progress of database encryption migration with minimal downtime.
![alt text](https://raw.githubusercontent.com/ariretiarno/postgresql-replication-monitor/refs/heads/main/image/image.png)

## Overview

This application monitors PostgreSQL logical replication during the process of encrypting an RDS database as described in the [AWS Database Blog](https://aws.amazon.com/blogs/database/encrypt-amazon-rds-for-postgresql-and-amazon-aurora-postgresql-database-with-minimal-downtime/).

### Features

- **Real-time Monitoring**: WebSocket-based live updates
- **Multi-Database Support**: Monitor multiple publications and subscriptions across databases
- **LSN Tracking**: Track Log Sequence Numbers (LSN) and replication lag
- **Replication Statistics**: Monitor replication slots, publications, and subscriptions
- **Health Monitoring**: Automatic health checks with configurable thresholds
- **Modern Dashboard**: Clean, responsive UI with real-time metrics

## Monitored Metrics

### Source Database (Unencrypted)
- Publications and their tables
- Replication slots status
- Current WAL LSN
- Confirmed flush LSN
- LSN distance (replication lag in bytes)
- Replication slot activity

### Target Database (Encrypted)
- Subscriptions status
- Received LSN
- Last message timestamps
- Subscription activity

### Overall Health
- Total publications and subscriptions
- Active vs inactive replication slots
- Maximum replication lag (bytes and seconds)
- System health status (healthy/warning/critical)

## Prerequisites

- Go 1.21 or later
- PostgreSQL 10+ with logical replication enabled
- Network access to both source and target databases

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd monitoring-replication
```

2. Install dependencies:
```bash
go mod download
```

3. Configure your databases:
```bash
cp config.yaml config.yaml.local
# Edit config.yaml.local with your database credentials
```

## Configuration

Edit `config.yaml` with your database connection details:

```yaml
databases:
  - name: "source-db"
    host: "source-db.region.rds.amazonaws.com"
    port: 5432
    user: "postgres"
    password: "your-password"
    dbname: "postgres"
    role: "source"
    
  - name: "target-db"
    host: "target-db.region.rds.amazonaws.com"
    port: 5432
    user: "postgres"
    password: "your-password"
    dbname: "postgres"
    role: "target"

server:
  port: 8080
  refresh_interval: 5  # seconds

monitoring:
  lag_threshold: 1048576  # 1MB in bytes
  inactive_threshold: 60  # seconds
```

### Configuration Options

- **databases**: Array of database configurations
  - `name`: Friendly name for the database
  - `host`: Database hostname
  - `port`: Database port (default: 5432)
  - `user`: Database user
  - `password`: Database password
  - `dbname`: Database name to connect to
  - `role`: Either "source" or "target"

- **server**: Web server configuration
  - `port`: HTTP server port
  - `refresh_interval`: How often to refresh metrics (in seconds)

- **monitoring**: Alert thresholds
  - `lag_threshold`: Alert when replication lag exceeds this value (bytes)
  - `inactive_threshold`: Alert when replication is inactive for this duration (seconds)

## Usage

### Running the Monitor

```bash
# Using default config.yaml
go run cmd/monitor/main.go

# Using custom config file
go run cmd/monitor/main.go -config config.yaml.local
```

### Building the Binary

```bash
go build -o bin/monitor cmd/monitor/main.go
./bin/monitor -config config.yaml
```

### Accessing the Dashboard

Once running, open your browser to:
```
http://localhost:8080
```

The dashboard will automatically connect via WebSocket and display real-time updates.

## Dashboard Features

### Summary Cards
- **Publications**: Total number of publications on source database
- **Subscriptions**: Total number of subscriptions on target database
- **Replication Slots**: Active/Total replication slots
- **Max Lag**: Maximum replication lag across all slots

### Health Status
- Overall system health (Healthy/Warning/Critical)
- List of current issues and alerts

### Database Details
For each database, the dashboard shows:
- Connection status
- Current LSN
- Publications (source only)
- Replication slots (source only)
- Replication statistics with LSN distance
- Subscriptions (target only)
- Subscription statistics

## Monitoring During Encryption Migration

### Pre-Migration
1. Configure both source and target databases in `config.yaml`
2. Start the monitor before beginning the migration
3. Verify all databases are connected

### During Migration
1. Monitor the LSN distance to track replication progress
2. Watch for the LSN distance to approach zero
3. Check for any inactive replication slots
4. Monitor for alerts about high lag

### Cutover Decision
The dashboard helps you decide when to cutover by showing:
- LSN distance = 0 (replication is caught up)
- All replication slots are active
- No health warnings or critical issues

### Post-Migration
- Continue monitoring to ensure replication remains healthy
- Verify subscription statistics on the target database

## API Endpoints

### REST API
- `GET /api/snapshot`: Get current monitoring snapshot (JSON)

### WebSocket
- `WS /api/ws`: Real-time monitoring updates

## Troubleshooting

### Connection Issues
- Verify database credentials in config.yaml
- Ensure security groups allow connections from the monitoring server
- Check that `rds.logical_replication` is enabled on both databases

### No Replication Data
- Verify publications are created on the source database
- Verify subscriptions are created on the target database
- Check that replication slots exist and are active

### High Lag
- Check network connectivity between databases
- Verify target database has sufficient resources
- Review PostgreSQL logs for errors

## SQL Queries Used

The monitor uses these PostgreSQL queries:

### Replication Slots
```sql
SELECT slot_name, confirmed_flush_lsn, active,
       (pg_current_wal_lsn() - confirmed_flush_lsn) AS lsn_distance
FROM pg_replication_slots
WHERE slot_type = 'logical';
```

### Publications
```sql
SELECT pubname, puballtables, pubinsert, pubupdate, pubdelete
FROM pg_publication;
```

### Subscriptions
```sql
SELECT subname, subenabled, subpublications, subslotname
FROM pg_subscription;
```

## Security Considerations

- Store database passwords securely (use environment variables or secrets management)
- Use SSL/TLS connections to databases (`sslmode=require`)
- Restrict network access to the monitoring dashboard
- Consider using IAM authentication for RDS databases

## Performance

- Minimal overhead: Queries run every 5 seconds (configurable)
- Efficient connection pooling
- Parallel data collection from multiple databases
- WebSocket for efficient real-time updates

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

MIT License

## References

- [AWS Blog: Encrypt Amazon RDS for PostgreSQL with minimal downtime](https://aws.amazon.com/blogs/database/encrypt-amazon-rds-for-postgresql-and-amazon-aurora-postgresql-database-with-minimal-downtime/)
- [PostgreSQL Logical Replication Documentation](https://www.postgresql.org/docs/current/logical-replication.html)
- [PostgreSQL Replication Slots](https://www.postgresql.org/docs/current/logicaldecoding-explanation.html)
