# PostgreSQL Replication Monitor

A comprehensive monitoring solution for PostgreSQL logical replication using publication/subscription. Built with Go backend and React frontend with real-time monitoring capabilities.

## Features

- **Real-time LSN Monitoring**: Track Log Sequence Numbers and bytes on both source and target databases
- **Replication Lag Tracking**: Monitor write, flush, and replay lags
- **Publication Management**: View all publications and their configurations
- **Subscription Management**: Monitor active subscriptions and their status
- **Replication Slots**: Track replication slot status and WAL retention
- **Data Discrepancy Check**: Compare row counts between source and target databases
- **Beautiful Dashboard**: Modern, responsive UI with dark theme
- **Auto-refresh**: Real-time updates every 5-10 seconds

## Architecture

- **Monolithic Go Application**: Single binary with embedded HTML/CSS/JS
- **Frontend**: Vanilla JavaScript with TailwindCSS CDN
- **Database**: PostgreSQL (supports both encrypted and unencrypted instances)

## Prerequisites

- Go 1.21 or higher
- PostgreSQL 12 or higher with logical replication enabled
- Two PostgreSQL instances (source and target)

## Installation

### 1. Clone or navigate to the project directory

```bash
cd /Users/ariretiarno/CascadeProjects/pg-replication-monitor
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` with your database credentials:

```env
# Source Database (Unencrypted)
SOURCE_DB_HOST=your-source-host
SOURCE_DB_PORT=5432
SOURCE_DB_USER=postgres
SOURCE_DB_PASSWORD=your-password
SOURCE_DB_NAME=postgres
SOURCE_DB_SSLMODE=disable

# Target Database (Encrypted)
TARGET_DB_HOST=your-target-host
TARGET_DB_PORT=5432
TARGET_DB_USER=postgres
TARGET_DB_PASSWORD=your-password
TARGET_DB_NAME=postgres
TARGET_DB_SSLMODE=require

# Server Configuration
SERVER_PORT=8080
```

### 3. Install Go dependencies and run

```bash
go mod download
go run main.go
```

The application will be available at `http://localhost:8080`

## Development Mode

```bash
go run main.go
```

The server will automatically serve the HTML/JS files.

## API Endpoints

- `GET /api/health` - Health check
- `GET /api/summary` - Overall monitoring summary
- `GET /api/lsn/source` - Source database LSN information
- `GET /api/lsn/target` - Target database LSN information
- `GET /api/publications` - List all publications
- `GET /api/subscriptions` - List all subscriptions
- `GET /api/replication-slots` - List all replication slots
- `GET /api/replication-stats` - Replication statistics
- `GET /api/databases` - List all databases
- `POST /api/discrepancy-check` - Check data discrepancies

## PostgreSQL Setup

### Source Database (Unencrypted)

1. Enable logical replication:
```sql
ALTER SYSTEM SET wal_level = 'logical';
ALTER SYSTEM SET max_replication_slots = 10;
ALTER SYSTEM SET max_wal_senders = 10;
```

2. Restart PostgreSQL

3. Create publication:
```sql
-- For all tables in a database
CREATE PUBLICATION my_publication FOR ALL TABLES;

-- Or for specific tables
CREATE PUBLICATION my_publication FOR TABLE table1, table2;
```

### Target Database (Encrypted)

1. Create subscription:
```sql
CREATE SUBSCRIPTION my_subscription
CONNECTION 'host=source-host port=5432 dbname=mydb user=postgres password=xxx'
PUBLICATION my_publication;
```

2. Check subscription status:
```sql
SELECT * FROM pg_subscription;
SELECT * FROM pg_stat_subscription;
```

## Monitoring Metrics

### LSN (Log Sequence Number)
- **Current LSN**: Current write position in WAL
- **LSN Bytes**: Total bytes written
- **Replication Lag**: Difference between source and target LSN

### Replication Stats
- **Write Lag**: Time taken to write WAL to disk
- **Flush Lag**: Time taken to flush WAL to disk
- **Replay Lag**: Time taken to apply changes

### Health Status
- **Healthy**: All slots active, minimal lag
- **Warning**: Some slots inactive or moderate lag
- **Critical**: No active slots or high lag

## Troubleshooting

### Connection Issues
- Verify database credentials in `.env`
- Check PostgreSQL `pg_hba.conf` for connection permissions
- Ensure network connectivity between monitoring server and databases

### No Replication Data
- Verify publications exist on source database
- Verify subscriptions exist on target database
- Check replication slots are active
- Review PostgreSQL logs for errors

### High Replication Lag
- Check network latency between source and target
- Monitor disk I/O on target database
- Verify target database has sufficient resources
- Check for long-running transactions

## Production Deployment

### Using Docker (Optional)

Create a `Dockerfile`:
```dockerfile
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY . .
RUN go mod download
RUN go build -o monitor main.go

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/monitor .
COPY --from=builder /app/index.html .
COPY --from=builder /app/static ./static
EXPOSE 8080
CMD ["./monitor"]
```

Build and run:
```bash
docker build -t pg-replication-monitor .
docker run -p 8080:8080 --env-file .env pg-replication-monitor
```

### Systemd Service

Create `/etc/systemd/system/pg-monitor.service`:
```ini
[Unit]
Description=PostgreSQL Replication Monitor
After=network.target

[Service]
Type=simple
User=postgres
WorkingDirectory=/opt/pg-replication-monitor
ExecStart=/opt/pg-replication-monitor/monitor
Restart=on-failure
EnvironmentFile=/opt/pg-replication-monitor/.env

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable pg-monitor
sudo systemctl start pg-monitor
```

## Security Considerations

- Use strong passwords for database connections
- Enable SSL/TLS for database connections in production
- Restrict network access to monitoring server
- Use read-only database users for monitoring
- Keep `.env` file secure and never commit to version control

## License

MIT License

## Support

For issues and questions, please refer to the PostgreSQL documentation:
- [Logical Replication](https://www.postgresql.org/docs/current/logical-replication.html)
- [Publications](https://www.postgresql.org/docs/current/sql-createpublication.html)
- [Subscriptions](https://www.postgresql.org/docs/current/sql-createsubscription.html)
