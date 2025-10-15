# Quick Start Guide

Get the PostgreSQL Replication Monitor up and running in 5 minutes.

## Step 1: Configure Your Databases

Copy the example configuration:
```bash
cp config.yaml config.yaml.local
```

Edit `config.yaml.local` with your database details:
```yaml
databases:
  - name: "source-db"
    host: "your-source-db.region.rds.amazonaws.com"
    port: 5432
    user: "postgres"
    password: "your-password"
    dbname: "postgres"
    role: "source"
    
  - name: "target-db"
    host: "your-target-db.region.rds.amazonaws.com"
    port: 5432
    user: "postgres"
    password: "your-password"
    dbname: "postgres"
    role: "target"
```

## Step 2: Install Dependencies

```bash
go mod download
```

## Step 3: Run the Monitor

```bash
# Option 1: Using go run
go run cmd/monitor/main.go -config config.yaml.local

# Option 2: Using make
make run-local

# Option 3: Build and run
make build
./bin/monitor -config config.yaml.local
```

## Step 4: Access the Dashboard

Open your browser to:
```
http://localhost:8080
```

You should see:
- ✅ Connection status (green dot = connected)
- 📊 Summary cards showing publications, subscriptions, slots, and lag
- 💚 Health status
- 🗄️ Detailed database information

## What to Monitor During Migration

### Before Starting Replication
- ✅ Both databases show "Connected"
- ✅ Publications appear on source database
- ✅ Replication slots are created

### During Replication
- 📉 Watch LSN Distance decrease over time
- ⚡ Monitor replication lag (should be low)
- ✅ Ensure all slots show "Active"

### Ready for Cutover When:
- ✅ LSN Distance = 0 bytes (or very close)
- ✅ All replication slots are active
- ✅ Health status is "Healthy"
- ✅ No warnings or critical issues

## Troubleshooting

### Can't Connect to Database?
1. Check your credentials in config.yaml.local
2. Verify security groups allow your IP
3. Ensure `rds.logical_replication = on`

### No Replication Data Showing?
1. Verify publications exist on source:
   ```sql
   SELECT * FROM pg_publication;
   ```
2. Verify subscriptions exist on target:
   ```sql
   SELECT * FROM pg_subscription;
   ```
3. Check replication slots:
   ```sql
   SELECT * FROM pg_replication_slots;
   ```

### High Replication Lag?
- Check network connectivity
- Verify target database has enough resources
- Review PostgreSQL logs for errors

## Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Customize alert thresholds in config.yaml
- Set up the monitor to run as a service during migration

## Example: Complete Migration Workflow

```bash
# 1. Start the monitor
make run-local

# 2. In another terminal, set up replication on source DB
psql -h source-db.region.rds.amazonaws.com -U postgres -d mydb
CREATE PUBLICATION encryptdb_post FOR ALL TABLES;

# 3. Create replication slot
SELECT pg_create_logical_replication_slot('encryptdb_post', 'pgoutput');

# 4. Take snapshot and restore to encrypted DB
# (Follow AWS blog steps)

# 5. On target DB, create subscription
psql -h target-db.region.rds.amazonaws.com -U postgres -d mydb
CREATE SUBSCRIPTION encryptdb_post 
CONNECTION 'host=source-db... user=postgres password=... dbname=mydb'
PUBLICATION encryptdb_post
WITH (copy_data = false, create_slot = false, enabled = false, 
      slot_name = 'encryptdb_post');

# 6. Advance the replication origin (get LSN from logs)
SELECT pg_replication_origin_advance('pg_XXXX', 'LSN_FROM_LOGS');

# 7. Enable subscription
ALTER SUBSCRIPTION encryptdb_post ENABLE;

# 8. Monitor dashboard until LSN distance = 0

# 9. Cutover when ready!
```

## Support

For issues or questions, please refer to:
- [README.md](README.md) - Full documentation
- [AWS Blog Post](https://aws.amazon.com/blogs/database/encrypt-amazon-rds-for-postgresql-and-amazon-aurora-postgresql-database-with-minimal-downtime/)
- PostgreSQL documentation on logical replication
