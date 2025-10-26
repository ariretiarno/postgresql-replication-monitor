# Source vs Target Database Guide

## Visual Indicators Added

The application now clearly shows which database (SOURCE or TARGET) each component belongs to using color-coded badges and information panels.

## Color Coding System

### 🔵 **BLUE = SOURCE Database** (Unencrypted)
- **Publications Tab**: Blue badges and borders
- **Replication Stats Tab**: Orange info panel (data from source)
- **Replication Slots Tab**: Green info panel (created on source)
- **Dashboard**: Blue border on Source LSN card

### 🟣 **PURPLE = TARGET Database** (Encrypted)
- **Subscriptions Tab**: Purple badges and borders
- **Dashboard**: Purple border on Target LSN card

## Component Locations

### On SOURCE Database (Unencrypted)
1. **Publications** 🔵
   - Created on source database
   - Defines which tables to replicate
   - One publication per database
   - Shows: Database name, slot name, confirmed LSN, active status

2. **Replication Slots** 🟢
   - Created on source database
   - One slot per subscription
   - Tracks replication progress
   - Prevents WAL deletion until replicated

3. **Replication Statistics** 🟠
   - Monitored from source database
   - Shows data being sent to target
   - Displays: Sent LSN, Write LSN, Flush LSN, Replay LSN
   - Shows lag metrics (write lag, flush lag, replay lag)

### On TARGET Database (Encrypted)
1. **Subscriptions** 🟣
   - Created on target database
   - Connects to source publication
   - One subscription per database
   - Shows: Database name, slot name, restart LSN, active status

## How Replication Works

```
┌─────────────────────────────────────────────────────────────────┐
│                    LOGICAL REPLICATION FLOW                      │
└─────────────────────────────────────────────────────────────────┘

SOURCE (Unencrypted)                    TARGET (Encrypted)
┌──────────────────┐                   ┌──────────────────┐
│                  │                   │                  │
│  📘 Publication  │                   │  📙 Subscription │
│  (db1_pub)       │◄──────────────────│  (db1_sub)       │
│                  │   Connects to     │                  │
│  ┌────────────┐  │                   │                  │
│  │ Tables:    │  │                   │                  │
│  │ - users    │  │                   │                  │
│  │ - orders   │  │                   │                  │
│  │ - products │  │                   │                  │
│  └────────────┘  │                   │                  │
│                  │                   │                  │
│  🔌 Repl. Slot   │                   │                  │
│  (db1_slot)      │                   │                  │
│                  │                   │                  │
│  📊 WAL Stream   │────────────►      │  💾 Apply Data   │
│                  │   Streaming       │                  │
└──────────────────┘                   └──────────────────┘
```

## Setup Process

### Step 1: On SOURCE Database
```sql
-- Create publication (one per database)
CREATE PUBLICATION db1_pub FOR ALL TABLES;
```

### Step 2: On TARGET Database
```sql
-- Create subscription (connects to source)
CREATE SUBSCRIPTION db1_sub
CONNECTION 'host=source-host port=5432 dbname=db1 user=replicator password=xxx'
PUBLICATION db1_pub;
```

### Step 3: Automatic (on SOURCE)
- Replication slot is automatically created when subscription connects
- Slot name matches subscription name
- Slot tracks replication progress

## Dashboard Indicators

### Top Legend Bar
- **BLUE Badge**: SOURCE - Publications, Replication Stats, Slots
- **PURPLE Badge**: TARGET - Subscriptions, Receiving Data
- **Lightning Icon**: Bidirectional Flow indicator

### Dashboard Tab
- **Left Card** (Blue border): SOURCE Database LSN
  - Current LSN
  - WAL Insert Position
  - Shows how much data has been written

- **Right Card** (Purple border): TARGET Database LSN
  - Last Received LSN
  - Last Replay Position
  - Shows how much data has been applied

### Publications Tab
- Blue info panel at top
- Each publication card has blue "SOURCE" badge
- Shows databases with active publications

### Subscriptions Tab
- Purple info panel at top
- Each subscription card has purple "TARGET" badge
- Shows databases with active subscriptions

### Replication Stats Tab
- Orange info panel at top
- Shows active connections from SOURCE to TARGET
- Displays lag metrics

### Replication Slots Tab
- Green info panel at top
- Shows slots created on SOURCE
- One slot per subscription

## Your 33 Database Setup

For each of your 33 databases:

1. **On SOURCE** (Unencrypted):
   - ✅ 1 Publication per database = 33 publications
   - ✅ 1 Replication Slot per database = 33 slots

2. **On TARGET** (Encrypted):
   - ✅ 1 Subscription per database = 33 subscriptions

3. **Result**:
   - 33 active replication streams
   - Each database independently replicated
   - All monitored in one dashboard

## Monitoring Tips

### Check SOURCE Health
1. Go to **Replication Stats** tab (orange panel)
   - All 33 connections should show "streaming"
   - Check lag metrics (should be low)

2. Go to **Replication Slots** tab (green panel)
   - All 33 slots should be "Active"
   - WAL status should be "reserved"

3. Go to **Publications** tab (blue panel)
   - All 33 databases listed
   - All should show active status

### Check TARGET Health
1. Go to **Subscriptions** tab (purple panel)
   - All 33 databases listed
   - All should show active status
   - Check restart LSN values

2. Go to **Dashboard** tab
   - Compare SOURCE LSN vs TARGET LSN
   - Lag should be minimal (< 1MB typically)

## Troubleshooting

### If Publication Shows Inactive (Blue Badge)
- Check on SOURCE database
- Verify publication exists: `SELECT * FROM pg_publication;`
- Check replication slot: `SELECT * FROM pg_replication_slots;`

### If Subscription Shows Inactive (Purple Badge)
- Check on TARGET database
- Verify subscription exists: `SELECT * FROM pg_subscription;`
- Check subscription status: `SELECT * FROM pg_stat_subscription;`
- Verify connection string is correct

### If Replication Lag is High
- Check network between SOURCE and TARGET
- Check disk I/O on TARGET
- Look for long-running transactions
- Review **Replication Stats** tab for lag details

## Quick Reference

| Component | Location | Color | Tab |
|-----------|----------|-------|-----|
| Publications | SOURCE | 🔵 Blue | Publications |
| Subscriptions | TARGET | 🟣 Purple | Subscriptions |
| Replication Slots | SOURCE | 🟢 Green | Replication Slots |
| Replication Stats | SOURCE | 🟠 Orange | Replication Stats |
| Source LSN | SOURCE | 🔵 Blue | Dashboard |
| Target LSN | TARGET | 🟣 Purple | Dashboard |

## Benefits of Visual Indicators

1. **Clarity**: Instantly know which database you're looking at
2. **Troubleshooting**: Quickly identify where issues occur
3. **Learning**: Understand replication architecture better
4. **Confidence**: Verify correct setup at a glance
5. **Monitoring**: Track both sides of replication easily

## Next Steps

1. Run the application: `go run main.go`
2. Visit: `http://localhost:8080`
3. Check the top legend bar for color coding
4. Navigate through tabs to see SOURCE/TARGET indicators
5. Verify all 33 databases show correct status
