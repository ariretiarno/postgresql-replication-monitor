# Get Started in 3 Steps

Choose your path based on your needs:

## Path 1: Try It Now (5 minutes)

**Perfect for**: Testing the application locally before connecting to real databases.

```bash
# 1. Start test databases and setup replication
make docker-demo

# 2. In a new terminal, start the monitor
make run-docker

# 3. Open your browser
open http://localhost:8080
```

**What you'll see:**
- 2 databases (source and target)
- 1 publication with test data
- 1 active replication slot
- Real-time LSN tracking
- Live replication statistics

**Test replication:**
```bash
make docker-test
```

Watch the dashboard update in real-time as data replicates!

---

## Path 2: Monitor Your RDS Migration (10 minutes)

**Perfect for**: Actual database encryption migration.

### Step 1: Configure Your Databases

```bash
cp config.yaml config.yaml.local
nano config.yaml.local
```

Update with your RDS endpoints:
```yaml
databases:
  - name: "source-db"
    host: "your-source.region.rds.amazonaws.com"
    port: 5432
    user: "postgres"
    password: "your-password"
    dbname: "postgres"
    role: "source"
    
  - name: "target-db"
    host: "your-target.region.rds.amazonaws.com"
    port: 5432
    user: "postgres"
    password: "your-password"
    dbname: "postgres"
    role: "target"
```

### Step 2: Build and Run

```bash
# Download dependencies
make deps

# Build the application
make build

# Run the monitor
./bin/monitor -config config.yaml.local
```

### Step 3: Access Dashboard

```
http://localhost:8080
```

**Before you start replication, you should see:**
- ✅ Both databases connected
- Publications on source (if created)
- Replication slots on source (if created)
- No subscriptions on target yet

**After setting up replication:**
- ✅ Active replication slots
- ✅ Enabled subscriptions
- 📊 LSN distance decreasing
- 💚 Healthy status when caught up

---

## Path 3: Production Deployment (30 minutes)

**Perfect for**: Running the monitor on EC2/ECS during migration.

### Quick Deploy to EC2

```bash
# 1. SSH to your EC2 instance
ssh ec2-user@your-instance

# 2. Install Go
wget https://go.dev/dl/go1.21.0.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.21.0.linux-amd64.tar.gz
export PATH=$PATH:/usr/local/bin/go/bin

# 3. Clone and build
git clone <your-repo> /opt/monitoring-replication
cd /opt/monitoring-replication
make build

# 4. Configure
sudo mkdir -p /etc/monitoring-replication
sudo cp config.yaml /etc/monitoring-replication/config.yaml
sudo nano /etc/monitoring-replication/config.yaml

# 5. Run
./bin/monitor -config /etc/monitoring-replication/config.yaml
```

For systemd service setup, see [DEPLOYMENT.md](DEPLOYMENT.md).

---

## What to Monitor

### Key Metrics

| Metric | What It Means | Target Value |
|--------|---------------|--------------|
| **LSN Distance** | How far behind target is from source | 0 bytes = ready for cutover |
| **Replication Lag** | Time delay in seconds | < 1 second = healthy |
| **Slot Status** | Is replication active? | Active = good |
| **Health Status** | Overall system health | Healthy = ready |

### Dashboard Sections

1. **Summary Cards** (top)
   - Total publications, subscriptions, slots
   - Maximum lag across all databases

2. **Health Status**
   - Overall health indicator
   - List of issues (if any)

3. **Database Details** (per database)
   - Publications and tables (source)
   - Replication slots and stats (source)
   - Subscriptions (target)
   - Subscription statistics (target)

---

## Common Workflows

### Workflow 1: Test Locally First

```bash
# 1. Test with Docker
make docker-demo
make run-docker

# 2. Verify everything works
make docker-test

# 3. Stop Docker
make docker-down

# 4. Configure for real databases
cp config.yaml config.yaml.local
nano config.yaml.local

# 5. Run against real databases
make run-local
```

### Workflow 2: Monitor Existing Replication

If you already have replication set up:

```bash
# 1. Configure databases
nano config.yaml

# 2. Run monitor
make run

# 3. Open dashboard
open http://localhost:8080
```

You should immediately see your existing publications, subscriptions, and replication status.

### Workflow 3: Complete Migration

```bash
# 1. Start monitor BEFORE creating subscriptions
make run-local

# 2. In PostgreSQL, create publications on source
# (see MIGRATION_EXAMPLE.md)

# 3. Take snapshot and restore to encrypted instance

# 4. Create subscriptions on target
# (see MIGRATION_EXAMPLE.md)

# 5. Watch dashboard until LSN distance = 0

# 6. Perform cutover when ready
```

---

## Troubleshooting

### Can't connect to database?

```bash
# Test connection manually
psql -h your-db.region.rds.amazonaws.com -U postgres -d postgres

# Check security groups allow your IP
# Verify credentials are correct
```

### Dashboard shows "Disconnected"?

- Check database endpoints in config
- Verify network connectivity
- Check PostgreSQL logs for connection errors

### No replication data showing?

```sql
-- On source, verify publications exist
SELECT * FROM pg_publication;

-- On source, verify slots exist
SELECT * FROM pg_replication_slots;

-- On target, verify subscriptions exist
SELECT * FROM pg_subscription;
```

### Build errors?

```bash
# Update dependencies
make deps

# Try building again
make build
```

---

## Next Steps

After getting started:

1. **Read the docs**
   - [README.md](README.md) - Complete documentation
   - [MIGRATION_EXAMPLE.md](MIGRATION_EXAMPLE.md) - Step-by-step migration guide
   - [TESTING.md](TESTING.md) - Testing scenarios

2. **Customize configuration**
   - Adjust refresh interval
   - Set alert thresholds
   - Configure multiple databases

3. **Plan your migration**
   - Test in non-production first
   - Document cutover procedure
   - Prepare rollback plan

---

## Quick Reference

### Essential Commands

```bash
# Build
make build

# Run with default config
make run

# Run with custom config
make run-local

# Docker test environment
make docker-demo
make run-docker
make docker-test
make docker-down

# Help
make help
```

### Essential Files

- `config.yaml` - Configuration template
- `README.md` - Full documentation
- `QUICKSTART.md` - Quick start guide
- `MIGRATION_EXAMPLE.md` - Complete migration example
- `TESTING.md` - Testing guide
- `DEPLOYMENT.md` - Production deployment

### Essential URLs

- Dashboard: `http://localhost:8080`
- API: `http://localhost:8080/api/snapshot`
- WebSocket: `ws://localhost:8080/api/ws`

---

## Support

Need help?

1. Check the documentation files
2. Review [MIGRATION_EXAMPLE.md](MIGRATION_EXAMPLE.md) for complete walkthrough
3. Test with Docker environment first
4. Check application logs for errors

---

## Success Criteria

You'll know it's working when:

✅ Dashboard shows "Connected" for all databases  
✅ Publications appear on source database  
✅ Replication slots show as "Active"  
✅ LSN distance decreases over time  
✅ Health status shows "Healthy"  
✅ Data inserted on source appears on target  

**When LSN distance = 0 bytes, you're ready for cutover!**

---

Happy monitoring! 🚀
