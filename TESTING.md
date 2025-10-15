# Testing Guide

This guide shows how to test the PostgreSQL Replication Monitor locally using Docker.

## Quick Test with Docker

### 1. Start Test Databases

```bash
make docker-demo
```

This will:
- Start two PostgreSQL containers (source on port 5432, target on port 5433)
- Create test tables and data
- Set up logical replication between them

### 2. Start the Monitor

In a new terminal:
```bash
make run-docker
```

### 3. Open the Dashboard

Navigate to: http://localhost:8080

You should see:
- ✅ Both databases connected
- 📊 1 publication on source
- 📊 1 subscription on target
- 📊 1 active replication slot
- 💚 Healthy status

### 4. Test Replication

Insert data on the source database:
```bash
make docker-test
```

Or manually:
```bash
PGPASSWORD=postgres psql -h localhost -p 5432 -U postgres -d testdb

INSERT INTO test_data (data) VALUES ('Test data at ' || NOW());
SELECT COUNT(*) FROM test_data;
```

Check the target database:
```bash
PGPASSWORD=postgres psql -h localhost -p 5433 -U postgres -d testdb

SELECT COUNT(*) FROM test_data;
```

Watch the dashboard update in real-time showing:
- LSN progression
- Replication lag (should be near 0)
- Active replication status

### 5. Monitor Replication Stats

The dashboard shows:
- **Current LSN**: Latest write-ahead log position
- **Confirmed Flush LSN**: Last position replicated to target
- **LSN Distance**: Bytes behind (should be 0 or very small)
- **Replication Lag**: Time delay in seconds

### 6. Cleanup

```bash
make docker-down
```

## Manual Testing

### Setup Source Database

```sql
-- Enable logical replication (already enabled in Docker)
-- Create test table
CREATE TABLE test_data (
    id SERIAL PRIMARY KEY,
    data TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert test data
INSERT INTO test_data (data) 
SELECT 'Test data ' || generate_series(1, 1000);

-- Create publication
CREATE PUBLICATION test_pub FOR ALL TABLES;

-- Create replication slot
SELECT pg_create_logical_replication_slot('test_slot', 'pgoutput');

-- Verify
SELECT * FROM pg_publication;
SELECT * FROM pg_replication_slots;
```

### Setup Target Database

```sql
-- Create same table structure
CREATE TABLE test_data (
    id SERIAL PRIMARY KEY,
    data TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Copy initial data (simulate snapshot)
-- Use pg_dump/restore in real scenario

-- Create subscription
CREATE SUBSCRIPTION test_sub
CONNECTION 'host=source-host port=5432 user=postgres password=xxx dbname=testdb'
PUBLICATION test_pub
WITH (
    create_slot = false,
    slot_name = 'test_slot'
);

-- Verify
SELECT * FROM pg_subscription;
SELECT * FROM pg_stat_subscription;
```

### Monitor Queries

Check replication on source:
```sql
SELECT 
    slot_name,
    active,
    pg_current_wal_lsn() as current_lsn,
    confirmed_flush_lsn,
    pg_wal_lsn_diff(pg_current_wal_lsn(), confirmed_flush_lsn) as lag_bytes
FROM pg_replication_slots
WHERE slot_type = 'logical';
```

Check subscription on target:
```sql
SELECT 
    subname,
    received_lsn,
    latest_end_lsn,
    last_msg_receipt_time
FROM pg_stat_subscription;
```

## Testing Scenarios

### Scenario 1: Normal Replication
1. Insert data on source
2. Watch LSN distance decrease to 0
3. Verify data appears on target

### Scenario 2: High Load
```bash
# Generate continuous inserts
for i in {1..1000}; do
    PGPASSWORD=postgres psql -h localhost -p 5432 -U postgres -d testdb \
        -c "INSERT INTO test_data (data) VALUES ('Load test $i');"
done
```

Watch the dashboard show:
- Increasing LSN distance during load
- LSN distance returning to 0 after load completes

### Scenario 3: Replication Lag
1. Stop the subscription: `ALTER SUBSCRIPTION test_sub DISABLE;`
2. Insert data on source
3. Watch LSN distance increase
4. Re-enable: `ALTER SUBSCRIPTION test_sub ENABLE;`
5. Watch LSN distance decrease back to 0

### Scenario 4: Connection Loss
1. Stop target database
2. Watch dashboard show "Disconnected" status
3. Restart target database
4. Watch dashboard reconnect automatically

## Performance Testing

### Measure Replication Throughput

```bash
# Insert 10,000 rows and measure time
time PGPASSWORD=postgres psql -h localhost -p 5432 -U postgres -d testdb <<EOF
INSERT INTO test_data (data)
SELECT 'Performance test ' || generate_series(1, 10000);
EOF

# Check how long it takes to replicate
# Monitor LSN distance in dashboard
```

### Stress Test

```bash
# Multiple concurrent inserts
for i in {1..10}; do
    (
        for j in {1..1000}; do
            PGPASSWORD=postgres psql -h localhost -p 5432 -U postgres -d testdb \
                -c "INSERT INTO test_data (data) VALUES ('Stress test $i-$j');" &
        done
    ) &
done
wait
```

## Troubleshooting Tests

### Replication Not Working?

Check publication:
```sql
SELECT * FROM pg_publication_tables WHERE pubname = 'test_pub';
```

Check slot is active:
```sql
SELECT * FROM pg_replication_slots WHERE slot_name = 'test_slot';
```

Check subscription is enabled:
```sql
SELECT subname, subenabled FROM pg_subscription WHERE subname = 'test_sub';
```

### Dashboard Not Updating?

1. Check WebSocket connection in browser console
2. Verify refresh_interval in config
3. Check server logs for errors

### Data Not Replicating?

1. Check subscription worker is running:
   ```sql
   SELECT * FROM pg_stat_subscription;
   ```
2. Check for replication errors in PostgreSQL logs
3. Verify network connectivity between databases

## Expected Results

### Healthy Replication
- ✅ LSN distance: 0 bytes (or very small, < 1KB)
- ✅ Replication lag: < 1 second
- ✅ All slots: Active
- ✅ Health status: Healthy

### Warning Signs
- ⚠️ LSN distance: > 1MB
- ⚠️ Replication lag: > 10 seconds
- ⚠️ Inactive slots

### Critical Issues
- ❌ Database disconnected
- ❌ Subscription disabled
- ❌ Replication slot missing
- ❌ LSN distance continuously growing
