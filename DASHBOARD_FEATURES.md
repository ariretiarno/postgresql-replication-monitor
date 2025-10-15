# Dashboard Features

## New Compact Dashboard (Optimized for 50+ Databases)

The dashboard has been redesigned to handle monitoring many databases efficiently.

### Key Features

#### 1. **No Auto-Scrolling**
- Dashboard stays at your current scroll position when updates arrive
- No jumping or moving when new data comes in
- Smooth, stable viewing experience

#### 2. **Compact Table View**
All databases displayed in a single, scannable table with columns:
- **Database**: Database name (click to expand details)
- **Role**: Source or Target
- **Status**: Connected/Disconnected
- **Current LSN**: Latest log sequence number
- **Pubs/Subs**: Number of publications (source) or subscriptions (target)
- **Slots**: Active/Total slots or enabled subscriptions
- **LSN Distance**: Replication lag in bytes (color-coded)
- **Lag (sec)**: Replication lag in seconds
- **Details**: Quick summary of replication slots/subscriptions

**Click any row to expand and see full details:**
- Publications with table counts and operations
- Replication slots with LSN and status
- Replication statistics with detailed lag info
- Subscriptions with publication and slot info
- Subscription statistics with timestamps

#### 3. **Fixed Header**
- Header stays visible while scrolling
- Always see summary stats and filters
- Quick access to search and filters

#### 4. **Summary Statistics** (Always Visible)
- Total Publications
- Total Subscriptions  
- Active Slots (Active/Total)
- Maximum Lag across all databases
- Overall Health Status

#### 5. **Search and Filters**
- **Search Box**: Filter databases by name
- **Role Filter**: Show only Source or Target databases
- **Status Filter**: 
  - All Status
  - Connected only
  - Disconnected only
  - With Issues (errors or high lag)

#### 6. **Color Coding**
- **Green**: LSN distance = 0 (caught up)
- **Orange**: LSN distance > 0 (replicating)
- **Blue**: Source databases
- **Green**: Target databases
- **Red**: Disconnected or errors

#### 7. **Issues Panel**
- Automatically shows when there are problems
- Lists all active issues
- Hidden when everything is healthy

### Usage Tips for 50+ Databases

#### Quick Monitoring Workflow

1. **Check Summary Stats** (top of page)
   - Glance at health status
   - Check max lag across all databases

2. **Filter to Problem Databases**
   - Select "With Issues" from status filter
   - Focus on databases that need attention

3. **Search for Specific Database**
   - Type database name in search box
   - Instantly filter to matching databases

4. **Monitor Source Databases**
   - Filter by "Source Only"
   - Check LSN distance for all replication slots
   - Green = ready for cutover

5. **Monitor Target Databases**
   - Filter by "Target Only"
   - Verify subscriptions are enabled
   - Check received LSN progress

### Example Scenarios

#### Scenario 1: Initial Setup
```
Filter: All Status
View: All 100 databases (50 source + 50 target)
Action: Verify all are connected
```

#### Scenario 2: During Replication
```
Filter: Source Only + With Issues
View: Only source databases with lag > 1MB
Action: Monitor these until lag = 0
```

#### Scenario 3: Ready for Cutover Check
```
Search: "production"
Filter: Source Only
View: Production databases only
Action: Verify all show 0 B lag
```

#### Scenario 4: Troubleshooting
```
Filter: Disconnected
View: Only disconnected databases
Action: Fix connection issues
```

### Performance

- **Fast Updates**: Table updates in-place without re-rendering entire page
- **Smooth Scrolling**: No layout shifts or jumps
- **Efficient Filtering**: Client-side filtering is instant
- **Low Memory**: Compact table uses less browser memory than card view

### Keyboard Shortcuts

- **Ctrl+F / Cmd+F**: Use browser find to search within table
- **Tab**: Navigate between filters
- **Scroll**: Smooth scrolling, position maintained on updates

### Mobile Responsive

- Table scrolls horizontally on small screens
- Fixed header remains visible
- Touch-friendly filter dropdowns

### Comparison: Old vs New Dashboard

| Feature | Old Dashboard | New Dashboard |
|---------|---------------|---------------|
| Layout | Card-based, vertical | Compact table |
| Scrolling | Jumps on update | Stays in place |
| Databases | Hard to scan many | Easy to scan 50+ |
| Search | No search | Real-time search |
| Filters | No filters | Role + Status filters |
| Space | ~200px per database | ~40px per database |
| Issues | Mixed with data | Separate panel |
| Summary | Large cards | Compact stats |

### Best Practices

1. **Use Filters**: Don't try to monitor all 50+ databases at once
2. **Focus on Issues**: Filter to "With Issues" during migration
3. **Search Specific**: Use search when checking specific databases
4. **Check Summary First**: Glance at summary stats before diving into details
5. **Monitor Source LSN**: Focus on source databases' LSN distance for cutover timing

### Technical Details

- **Update Frequency**: 5 seconds (configurable in config.yaml)
- **Scroll Preservation**: JavaScript saves and restores scroll position
- **Filter Performance**: Client-side filtering, no server requests
- **Memory Usage**: ~50KB per database in browser memory

### Future Enhancements

Potential additions:
- [ ] Sortable columns (click header to sort)
- [ ] Export to CSV
- [ ] Historical lag charts
- [ ] Alert thresholds per database
- [ ] Bulk actions (pause/resume replication)
- [ ] Dark mode
- [ ] Customizable columns
- [ ] Save filter preferences

## Configuration

No configuration needed! The new dashboard works with your existing `config.yaml`.

Just run:
```bash
make run
```

And open: http://localhost:8080

The dashboard will automatically adapt to however many databases you have configured.
