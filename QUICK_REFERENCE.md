# Quick Reference Guide

## Performance Optimizations Applied

### 1. **Reduced Database Queries**
- Changed from N queries (one per database) to 3 queries total
- Uses batch queries with GROUP BY for replication slots
- Caches publication/subscription counts globally

### 2. **Lazy Tab Loading**
- Tabs only load data when clicked
- Auto-refresh only updates Dashboard and Replication Stats tabs
- Other tabs refresh manually when you switch to them

### 3. **Optimized Queries**
- Single query for all replication slots grouped by database
- Removed per-database publication/subscription checks
- Uses indexed columns for faster lookups

## How to List All Publications & Subscriptions

### Quick Commands

**Connect to SOURCE database:**
```bash
psql -h source-host -U postgres -d postgres
```

**List all publications:**
```sql
SELECT pubname, puballtables FROM pg_publication;
```

**Connect to TARGET database:**
```bash
psql -h target-host -U postgres -d postgres
```

**List all subscriptions:**
```sql
SELECT subname, subenabled FROM pg_subscription;
```

### Detailed Information

See `queries.sql` file for comprehensive queries including:
- Publications with table lists
- Subscription status and lag
- Replication slot details
- Troubleshooting queries

## Monitoring Your 33 Databases

### In the Web UI

1. **Dashboard Tab** - Overall LSN and lag
2. **All Databases (33) Tab** - Individual status for each database:
   - 🟢 Green = Active replication
   - 🟡 Yellow = Partial (slots exist but inactive)
   - 🔴 Red = No replication configured

### Database Status Indicators

Each database card shows:
- **Publications**: Number of publications (✓ if exists)
- **Subscriptions**: Number of subscriptions (✓ if exists)
- **Replication Slots**: Active/Total slots (e.g., 2/3)

### Summary Statistics

At the bottom of "All Databases" tab:
- Total Databases: 33
- With Publications: X
- With Subscriptions: Y
- Active Replication: Z

## Common Tasks

### 1. Check Replication Status
```sql
-- On SOURCE
SELECT * FROM pg_stat_replication;

-- On TARGET
SELECT * FROM pg_stat_subscription;
```

### 2. Check Replication Lag
```sql
-- On SOURCE
SELECT 
    application_name,
    pg_wal_lsn_diff(sent_lsn, replay_lsn) AS lag_bytes,
    replay_lag
FROM pg_stat_replication;
```

### 3. List All Publications Across All Databases
```bash
# Create a script to check all 33 databases
for db in $(psql -h source-host -U postgres -t -c "SELECT datname FROM pg_database WHERE datistemplate = false"); do
    echo "Database: $db"
    psql -h source-host -U postgres -d $db -c "SELECT pubname FROM pg_publication;"
done
```

### 4. Check Specific Database Replication
```sql
-- On SOURCE
SELECT * FROM pg_replication_slots WHERE database = 'your_db_name';

-- Check if publication exists in specific database
\c your_db_name
SELECT * FROM pg_publication;
```

### 5. Monitor Discrepancies
Use the "Discrepancy Check" tab in the web UI:
1. Select database
2. Enter table names (comma-separated)
3. Click "Check Discrepancy"

## Troubleshooting Lag Issues

### If the UI is slow:

1. **Reduce auto-refresh interval** (in `app.js` line 6):
   ```javascript
   autoRefreshInterval = setInterval(refreshAll, 30000); // 30 seconds instead of 10
   ```

2. **Disable auto-refresh for heavy tabs**:
   - Publications, Subscriptions, Slots tabs don't auto-refresh
   - Only Dashboard and Replication Stats auto-refresh

3. **Use SQL queries directly** for bulk operations:
   ```bash
   psql -h source-host -U postgres -f queries.sql > output.txt
   ```

### If replication is lagging:

1. Check network latency
2. Check disk I/O on target
3. Check for long-running transactions
4. Review `pg_stat_replication` for lag metrics

## Configuration Tips

### For 33 Databases:

1. **Use connection pooling** (already configured in code):
   - MaxOpenConns: 10
   - MaxIdleConns: 5
   - ConnMaxLifetime: 1 hour

2. **Create publications efficiently**:
   ```sql
   -- For all tables in database
   CREATE PUBLICATION pub_all FOR ALL TABLES;
   
   -- For specific tables
   CREATE PUBLICATION pub_specific FOR TABLE table1, table2, table3;
   ```

3. **Monitor slot growth**:
   ```sql
   SELECT 
       slot_name,
       pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)::bigint) AS retained_wal
   FROM pg_replication_slots
   ORDER BY pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn) DESC;
   ```

## API Endpoints for Automation

```bash
# Get summary
curl http://localhost:8080/api/summary

# Get all databases with details
curl http://localhost:8080/api/databases/details

# Get publications
curl http://localhost:8080/api/publications

# Get subscriptions
curl http://localhost:8080/api/subscriptions

# Get replication slots
curl http://localhost:8080/api/replication-slots

# Get replication stats
curl http://localhost:8080/api/replication-stats

# Check discrepancy
curl -X POST http://localhost:8080/api/discrepancy-check \
  -H "Content-Type: application/json" \
  -d '{"database":"mydb","tables":["users","orders"]}'
```

## Best Practices

1. **Regular monitoring**: Check the dashboard daily
2. **Set up alerts**: Monitor max lag values
3. **Clean up inactive slots**: Remove unused replication slots
4. **Monitor disk space**: WAL files can grow if replication lags
5. **Test failover**: Regularly test your replication setup
6. **Document your setup**: Keep track of which databases have publications/subscriptions

## Need Help?

- Check PostgreSQL logs: `/var/log/postgresql/`
- Review replication status: `SELECT * FROM pg_stat_replication;`
- Check subscription errors: `SELECT * FROM pg_stat_subscription;`
- Use the web UI's "Discrepancy Check" to verify data sync
