# Quick Usage Guide

## Starting the Monitor

```bash
# Run with your config
make run

# Open browser
open http://localhost:8080
```

## Dashboard Overview

### Top Section (Always Visible)
- **Summary Stats**: Publications, Subscriptions, Active Slots, Max Lag, Health
- **Search Box**: Type database name to filter
- **Role Filter**: Show Source or Target databases only
- **Status Filter**: Show Connected, Disconnected, or databases With Issues

### Main Table
Each row shows:
- Database name with expand/collapse icon (►/▼)
- Role (source/target)
- Connection status
- Current LSN
- Number of publications/subscriptions
- Replication slot status
- LSN distance (lag in bytes)
- Lag in seconds
- Quick details

### Click to Expand
**Click any database row** to see full details:
- **Source databases**: Publications, Replication Slots, Replication Statistics
- **Target databases**: Subscriptions, Subscription Statistics

Click again to collapse.

## Common Tasks

### Monitor All Databases
1. Leave filters on "All"
2. Scroll through table
3. Look for orange/red indicators (problems)

### Check Specific Database
1. Type database name in search box
2. Click the row to see details
3. Check LSN distance and lag

### Find Problems
1. Select "With Issues" from status filter
2. Only databases with errors or high lag will show
3. Click each to see details

### Monitor Source Databases Only
1. Select "Source Only" from role filter
2. Check LSN distance column
3. Green = 0 bytes = ready for cutover

### Monitor Target Databases Only
1. Select "Target Only" from role filter
2. Check subscriptions are enabled
3. Verify received LSN is progressing

### Check Cutover Readiness
1. Filter to "Source Only"
2. Check all LSN distances are 0 B (green)
3. Verify all slots are Active
4. Check Health status is "HEALTHY"

## Understanding the Display

### Colors
- **Green**: Good (LSN distance = 0, connected)
- **Orange**: Replicating (LSN distance > 0)
- **Red**: Problem (disconnected, error)
- **Blue**: Source database
- **Green badge**: Target database

### LSN Distance
- **0 B**: Fully caught up, ready for cutover
- **< 1 MB**: Nearly caught up, replicating well
- **> 10 MB**: High lag, may need investigation
- **> 100 MB**: Very high lag, check network/resources

### Slot Status
- **Active**: Replication is working
- **Inactive**: Replication stopped (problem)

### Subscription Status
- **Enabled**: Subscription is active
- **Disabled**: Subscription is paused

## Tips for 50+ Databases

1. **Use filters liberally** - Don't try to monitor all at once
2. **Search for specific databases** - Faster than scrolling
3. **Filter to "With Issues"** - Focus on problems
4. **Keep expanded rows minimal** - Collapse when done viewing
5. **Watch the summary stats** - Quick health check at a glance

## Keyboard Tips

- **Type in search box**: Instant filter
- **Tab**: Move between filters
- **Scroll**: Page stays stable, no jumping
- **Click row**: Expand/collapse details

## Troubleshooting

### Dashboard not updating?
- Check connection status (top right)
- Should show green "Connected"
- If red, check server is running

### Can't find database?
- Clear search box
- Set filters to "All"
- Check database is in config.yaml

### Details not showing?
- Click the database row
- Look for ▼ icon (expanded)
- May need to wait for data collection

### Page jumping around?
- This should NOT happen anymore
- Scroll position is preserved on updates
- If it happens, report as bug

## Best Practices

### During Migration

1. **Before starting replication**:
   - Filter: All Status
   - Verify: All databases connected
   - Check: Publications created on source

2. **During replication**:
   - Filter: Source Only + With Issues
   - Monitor: LSN distance decreasing
   - Watch: Max Lag in summary stats

3. **Ready for cutover**:
   - Filter: Source Only
   - Verify: All LSN distances = 0 B
   - Check: All slots Active
   - Confirm: Health = HEALTHY

4. **After cutover**:
   - Filter: Target Only
   - Verify: Subscriptions enabled
   - Monitor: No errors

### Continuous Monitoring

- Check dashboard every 5-10 minutes
- Use "With Issues" filter to spot problems quickly
- Expand rows only when investigating specific issues
- Keep search/filters handy for quick access

## Example Workflows

### Workflow 1: Initial Check
```
1. Open dashboard
2. Check summary stats (top)
3. Verify all databases connected
4. Look for any red/orange indicators
```

### Workflow 2: Monitor Specific Database
```
1. Type database name in search
2. Click row to expand
3. Check replication stats
4. Verify LSN distance
5. Click row again to collapse
```

### Workflow 3: Find and Fix Issues
```
1. Select "With Issues" filter
2. See list of problem databases
3. Click each to see details
4. Fix issues
5. Verify they disappear from list
```

### Workflow 4: Cutover Decision
```
1. Select "Source Only" filter
2. Scan LSN Distance column
3. All should be green (0 B)
4. Click any to verify details
5. Check Health = HEALTHY
6. Proceed with cutover
```

## Refresh Rate

- Dashboard updates every **5 seconds** (default)
- Configurable in `config.yaml`:
  ```yaml
  server:
    refresh_interval: 5  # seconds
  ```
- Increase for less frequent updates
- Decrease for more real-time monitoring

## Need Help?

- See [DASHBOARD_FEATURES.md](DASHBOARD_FEATURES.md) for detailed feature list
- See [README.md](README.md) for complete documentation
- See [MIGRATION_EXAMPLE.md](MIGRATION_EXAMPLE.md) for migration walkthrough
