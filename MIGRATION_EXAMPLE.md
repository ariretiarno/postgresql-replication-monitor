# Complete Migration Example

This guide walks through a complete RDS PostgreSQL encryption migration using the monitoring dashboard.

## Scenario

- **Source**: Unencrypted RDS PostgreSQL 14 instance
- **Target**: Encrypted RDS PostgreSQL 14 instance (restored from snapshot)
- **Databases**: 3 databases with multiple schemas and tables
- **Downtime Goal**: < 5 minutes

## Pre-Migration Setup

### 1. Enable Logical Replication on Source

```sql
-- Connect to source RDS
psql -h source-db.us-east-1.rds.amazonaws.com -U postgres

-- Check current settings
SELECT name, setting 
FROM pg_settings 
WHERE name IN ('wal_level', 'rds.logical_replication');

-- If not enabled, modify parameter group
-- Via AWS Console or CLI:
aws rds modify-db-parameter-group \
  --db-parameter-group-name your-param-group \
  --parameters "ParameterName=rds.logical_replication,ParameterValue=1,ApplyMethod=pending-reboot"

-- Reboot instance
aws rds reboot-db-instance --db-instance-identifier source-db

-- Wait for reboot and verify
SELECT name, setting 
FROM pg_settings 
WHERE name IN ('wal_level', 'rds.logical_replication');
-- Should show: wal_level = logical, rds.logical_replication = on
```

### 2. Create Publications on Source

```sql
-- For each database, create publications
\c database1

-- Option 1: Publish all tables
CREATE PUBLICATION db1_publication FOR ALL TABLES;

-- Option 2: Publish specific tables
CREATE PUBLICATION db1_publication FOR TABLE 
    schema1.table1, 
    schema1.table2, 
    schema2.table3;

-- Repeat for other databases
\c database2
CREATE PUBLICATION db2_publication FOR ALL TABLES;

\c database3
CREATE PUBLICATION db3_publication FOR ALL TABLES;

-- Verify publications
SELECT pubname, puballtables 
FROM pg_publication;

-- Check which tables are published
SELECT schemaname, tablename, pubname
FROM pg_publication_tables
ORDER BY pubname, schemaname, tablename;
```

### 3. Create Replication Slots

```sql
-- For each database
\c database1
SELECT pg_create_logical_replication_slot('db1_slot', 'pgoutput');

\c database2
SELECT pg_create_logical_replication_slot('db2_slot', 'pgoutput');

\c database3
SELECT pg_create_logical_replication_slot('db3_slot', 'pgoutput');

-- Verify slots
SELECT slot_name, plugin, slot_type, database, active
FROM pg_replication_slots;
```

### 4. Take Snapshot

```bash
# Via AWS CLI
aws rds create-db-snapshot \
  --db-instance-identifier source-db \
  --db-snapshot-identifier source-db-pre-encryption-$(date +%Y%m%d-%H%M%S)

# Wait for snapshot to complete
aws rds wait db-snapshot-completed \
  --db-snapshot-identifier source-db-pre-encryption-20251014-150000

# Note the snapshot creation time and LSN from logs
```

### 5. Restore to Encrypted Instance

```bash
# Restore snapshot with encryption
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier target-db \
  --db-snapshot-identifier source-db-pre-encryption-20251014-150000 \
  --storage-encrypted \
  --kms-key-id arn:aws:kms:us-east-1:123456789012:key/your-kms-key \
  --db-instance-class db.r6g.xlarge \
  --publicly-accessible false

# Wait for instance to be available
aws rds wait db-instance-available \
  --db-instance-identifier target-db
```

### 6. Enable Logical Replication on Target

```bash
# Modify parameter group for target
aws rds modify-db-parameter-group \
  --db-parameter-group-name target-param-group \
  --parameters "ParameterName=rds.logical_replication,ParameterValue=1,ApplyMethod=pending-reboot"

# Reboot target
aws rds reboot-db-instance --db-instance-identifier target-db
```

## Start Monitoring

### 1. Configure Monitor

```yaml
# config.yaml
databases:
  - name: "source-db"
    host: "source-db.us-east-1.rds.amazonaws.com"
    port: 5432
    user: "postgres"
    password: "your-password"
    dbname: "postgres"  # Connect to postgres db to see all databases
    role: "source"
    
  - name: "target-db"
    host: "target-db.us-east-1.rds.amazonaws.com"
    port: 5432
    user: "postgres"
    password: "your-password"
    dbname: "postgres"
    role: "target"

server:
  port: 8080
  refresh_interval: 5

monitoring:
  lag_threshold: 10485760  # 10MB
  inactive_threshold: 60
```

### 2. Start Monitor

```bash
./bin/monitor -config config.yaml
```

Open dashboard: http://localhost:8080

**Expected Initial State:**
- ✅ Source DB: Connected, 3 publications, 3 replication slots (inactive)
- ✅ Target DB: Connected, 0 subscriptions
- ⚠️ Health: Warning (slots inactive)

## Setup Replication

### 1. Get LSN from Snapshot

```bash
# Find the LSN in CloudWatch logs
aws logs filter-log-events \
  --log-group-name /aws/rds/instance/target-db/postgresql \
  --filter-pattern 'invalid record length' \
  --start-time $(date -d '10 minutes ago' +%s)000

# Example output:
# 2025-10-14 15:00:00 UTC:...:LOG: invalid record length at 0/3A000110
# The LSN is: 0/3A000110
```

### 2. Create Subscriptions on Target

For each database:

```sql
-- Connect to target database1
psql -h target-db.us-east-1.rds.amazonaws.com -U postgres -d database1

-- Create subscription (disabled initially)
CREATE SUBSCRIPTION db1_subscription
CONNECTION 'host=source-db.us-east-1.rds.amazonaws.com port=5432 user=postgres password=your-password dbname=database1'
PUBLICATION db1_publication
WITH (
    copy_data = false,
    create_slot = false,
    enabled = false,
    synchronous_commit = false,
    connect = true,
    slot_name = 'db1_slot'
);

-- Get replication origin name
SELECT * FROM pg_replication_origin;
-- Note the roname (e.g., 'pg_16385')

-- Advance to snapshot LSN
SELECT pg_replication_origin_advance('pg_16385', '0/3A000110');

-- Enable subscription
ALTER SUBSCRIPTION db1_subscription ENABLE;

-- Verify
SELECT subname, subenabled, subslotname 
FROM pg_subscription;

SELECT * FROM pg_stat_subscription;
```

Repeat for database2 and database3.

**Dashboard After Setup:**
- ✅ Source: 3 publications, 3 active replication slots
- ✅ Target: 3 enabled subscriptions
- 📊 LSN distance: Decreasing
- 💚 Health: Healthy

## Monitor Replication Progress

### Watch the Dashboard

The dashboard will show real-time progress:

1. **Initial State** (T+0 minutes)
   - LSN Distance: ~500 MB (changes since snapshot)
   - Replication Lag: 15 minutes
   - Status: Active, replicating

2. **Catching Up** (T+10 minutes)
   - LSN Distance: ~100 MB
   - Replication Lag: 3 minutes
   - Status: Active, replicating

3. **Nearly Caught Up** (T+20 minutes)
   - LSN Distance: ~10 MB
   - Replication Lag: 30 seconds
   - Status: Active, replicating

4. **Ready for Cutover** (T+25 minutes)
   - LSN Distance: 0 bytes (or < 1 KB)
   - Replication Lag: < 1 second
   - Status: Active, synchronized
   - Health: Healthy ✅

### SQL Monitoring Queries

```sql
-- On source: Check replication status
SELECT 
    slot_name,
    database,
    active,
    pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), confirmed_flush_lsn)) as lag_size,
    pg_current_wal_lsn() as current_lsn,
    confirmed_flush_lsn
FROM pg_replication_slots
WHERE slot_type = 'logical'
ORDER BY database;

-- On target: Check subscription status
SELECT 
    subname,
    received_lsn,
    latest_end_lsn,
    last_msg_receipt_time,
    latest_end_time
FROM pg_stat_subscription;
```

## Cutover Process

### Pre-Cutover Checklist

- [ ] LSN distance = 0 bytes on all slots
- [ ] All replication slots active
- [ ] All subscriptions enabled
- [ ] No errors in PostgreSQL logs
- [ ] Dashboard shows "Healthy" status
- [ ] Application team ready
- [ ] Rollback plan documented

### Cutover Steps

**1. Announce Maintenance Window** (T-5 minutes)
```bash
# Notify users
echo "Maintenance starting in 5 minutes"
```

**2. Stop Application Writes** (T+0)
```bash
# Stop application servers or enable read-only mode
# Method depends on your application architecture
```

**3. Wait for Final Replication** (T+1 minute)
```bash
# Watch dashboard until LSN distance = 0
# Should take < 1 minute since no new writes
```

**4. Verify Data Consistency** (T+2 minutes)
```sql
-- On source
SELECT COUNT(*) FROM database1.schema1.table1;
SELECT COUNT(*) FROM database2.schema1.table1;
SELECT COUNT(*) FROM database3.schema1.table1;

-- On target (should match exactly)
SELECT COUNT(*) FROM database1.schema1.table1;
SELECT COUNT(*) FROM database2.schema1.table1;
SELECT COUNT(*) FROM database3.schema1.table1;
```

**5. Update Application Configuration** (T+3 minutes)
```bash
# Update connection strings to point to target-db
# Deploy configuration change
```

**6. Start Application** (T+4 minutes)
```bash
# Start application servers
# Verify connectivity to target database
```

**7. Verify Application** (T+5 minutes)
```bash
# Test critical application functions
# Verify writes are working
# Check application logs
```

**8. Monitor for Issues** (T+5 to T+30 minutes)
```bash
# Watch application metrics
# Monitor database performance
# Check for errors
```

## Post-Cutover

### 1. Keep Replication Running (Optional)

You can keep replication running for a safety period:

```sql
-- On target, disable subscriptions but keep them
ALTER SUBSCRIPTION db1_subscription DISABLE;
ALTER SUBSCRIPTION db2_subscription DISABLE;
ALTER SUBSCRIPTION db3_subscription DISABLE;

-- This allows quick rollback if needed
```

### 2. Cleanup (After Verification Period)

```sql
-- On target: Drop subscriptions
DROP SUBSCRIPTION db1_subscription;
DROP SUBSCRIPTION db2_subscription;
DROP SUBSCRIPTION db3_subscription;

-- On source: Drop replication slots
SELECT pg_drop_replication_slot('db1_slot');
SELECT pg_drop_replication_slot('db2_slot');
SELECT pg_drop_replication_slot('db3_slot');

-- On source: Drop publications
DROP PUBLICATION db1_publication;
DROP PUBLICATION db2_publication;
DROP PUBLICATION db3_publication;
```

### 3. Disable Logical Replication (Optional)

```bash
# If you don't need logical replication anymore
aws rds modify-db-parameter-group \
  --db-parameter-group-name target-param-group \
  --parameters "ParameterName=rds.logical_replication,ParameterValue=0,ApplyMethod=pending-reboot"
```

### 4. Decommission Source

```bash
# After verification period (e.g., 7 days)
# Take final snapshot
aws rds create-db-snapshot \
  --db-instance-identifier source-db \
  --db-snapshot-identifier source-db-final-before-deletion

# Delete source instance
aws rds delete-db-instance \
  --db-instance-identifier source-db \
  --skip-final-snapshot  # or create final snapshot
```

## Rollback Procedure

If issues are found after cutover:

**1. Immediate Rollback** (Within 30 minutes)
```bash
# Point application back to source database
# Update connection strings
# Restart application
```

**2. Data Sync Rollback** (If target has new data)
```sql
-- On source: Create reverse replication
-- This is complex and should be planned in advance
-- Usually better to fix forward than rollback
```

## Monitoring Metrics Summary

### Key Metrics to Watch

| Metric | Healthy | Warning | Critical |
|--------|---------|---------|----------|
| LSN Distance | < 1 KB | < 10 MB | > 100 MB |
| Replication Lag | < 1 sec | < 30 sec | > 60 sec |
| Slot Status | Active | Inactive < 10s | Inactive > 60s |
| Subscription Status | Enabled | Disabled | Error |

### Dashboard Indicators

- **Green (Healthy)**: Ready for cutover
- **Yellow (Warning)**: Monitor closely, not ready
- **Red (Critical)**: Investigation required

## Lessons Learned

### Best Practices

1. **Test First**: Run complete test migration in non-prod
2. **Monitor Early**: Start monitoring before creating subscriptions
3. **Off-Peak Hours**: Schedule cutover during low-traffic period
4. **Communication**: Keep stakeholders informed
5. **Verification**: Have data validation queries ready
6. **Rollback Plan**: Document and test rollback procedure

### Common Issues

**High Replication Lag**
- Cause: Large transaction on source
- Solution: Wait for transaction to complete and replicate

**Subscription Errors**
- Cause: Schema mismatch between source and target
- Solution: Ensure target schema matches source exactly

**Slot Inactive**
- Cause: Network connectivity issues
- Solution: Check security groups and network ACLs

## Timeline Example

Real-world timeline for 500 GB database:

- T-60 min: Enable logical replication on source
- T-30 min: Create publications and slots
- T-0 min: Take snapshot
- T+15 min: Snapshot complete
- T+45 min: Restore complete (encrypted instance available)
- T+50 min: Enable logical replication on target
- T+55 min: Start monitoring dashboard
- T+60 min: Create subscriptions
- T+90 min: Replication caught up (LSN distance = 0)
- T+95 min: Begin cutover
- T+100 min: Cutover complete
- **Total Downtime: 5 minutes**

## Conclusion

The monitoring dashboard provides:
- ✅ Real-time visibility into replication progress
- ✅ Clear indicators for cutover readiness
- ✅ Early warning of issues
- ✅ Confidence in migration success

With proper planning and monitoring, you can achieve minimal downtime database encryption migration.
