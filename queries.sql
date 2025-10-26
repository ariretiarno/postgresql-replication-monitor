-- ============================================
-- PostgreSQL Replication Monitoring Queries
-- ============================================

-- ============================================
-- PUBLICATIONS (Run on SOURCE database)
-- ============================================

-- 1. List all publications
SELECT 
    pubname,
    puballtables AS all_tables,
    pubinsert AS insert_enabled,
    pubupdate AS update_enabled,
    pubdelete AS delete_enabled,
    pubtruncate AS truncate_enabled
FROM pg_publication
ORDER BY pubname;

-- 2. List publications with their tables
SELECT 
    p.pubname,
    pt.schemaname,
    pt.tablename,
    p.puballtables
FROM pg_publication p
LEFT JOIN pg_publication_tables pt ON p.pubname = pt.pubname
ORDER BY p.pubname, pt.schemaname, pt.tablename;

-- 3. Count tables per publication
SELECT 
    p.pubname,
    COUNT(pt.tablename) as table_count,
    p.puballtables
FROM pg_publication p
LEFT JOIN pg_publication_tables pt ON p.pubname = pt.pubname
GROUP BY p.pubname, p.puballtables
ORDER BY p.pubname;

-- 4. Create publication for all tables in a database
-- CREATE PUBLICATION my_pub_all FOR ALL TABLES;

-- 5. Create publication for specific tables
-- CREATE PUBLICATION my_pub_specific FOR TABLE users, orders, products;

-- ============================================
-- SUBSCRIPTIONS (Run on TARGET database)
-- ============================================

-- 6. List all subscriptions
SELECT 
    subname,
    subenabled AS enabled,
    subpublications AS publications,
    subconninfo AS connection_info,
    subslotname AS slot_name,
    subsynccommit AS sync_commit
FROM pg_subscription
ORDER BY subname;

-- 7. Subscription status and statistics
SELECT 
    s.subname,
    sr.pid,
    sr.received_lsn,
    sr.latest_end_lsn,
    sr.last_msg_send_time,
    sr.last_msg_receipt_time,
    sr.latest_end_time,
    CASE 
        WHEN sr.pid IS NOT NULL THEN 'Active'
        ELSE 'Inactive'
    END as status
FROM pg_subscription s
LEFT JOIN pg_stat_subscription sr ON s.oid = sr.subid
ORDER BY s.subname;

-- 8. Subscription replication lag
SELECT 
    s.subname,
    pg_wal_lsn_diff(pg_current_wal_lsn(), sr.received_lsn) AS lag_bytes,
    pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), sr.received_lsn)::bigint) AS lag_size,
    EXTRACT(EPOCH FROM (now() - sr.last_msg_receipt_time)) AS seconds_since_last_message
FROM pg_subscription s
LEFT JOIN pg_stat_subscription sr ON s.oid = sr.subid
ORDER BY s.subname;

-- 9. Create subscription
-- CREATE SUBSCRIPTION my_sub
-- CONNECTION 'host=source-host port=5432 dbname=mydb user=replicator password=xxx'
-- PUBLICATION my_pub;

-- 10. Enable/Disable subscription
-- ALTER SUBSCRIPTION my_sub ENABLE;
-- ALTER SUBSCRIPTION my_sub DISABLE;

-- ============================================
-- REPLICATION SLOTS (Run on SOURCE database)
-- ============================================

-- 11. List all replication slots
SELECT 
    slot_name,
    plugin,
    slot_type,
    database,
    active,
    restart_lsn,
    confirmed_flush_lsn,
    wal_status,
    safe_wal_size,
    pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)::bigint) AS retained_wal
FROM pg_replication_slots
ORDER BY slot_name;

-- 12. Replication slot lag
SELECT 
    slot_name,
    database,
    active,
    pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn) AS lag_bytes,
    pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)::bigint) AS lag_size
FROM pg_replication_slots
WHERE slot_type = 'logical'
ORDER BY lag_bytes DESC;

-- 13. Inactive slots (potential issues)
SELECT 
    slot_name,
    database,
    plugin,
    restart_lsn,
    confirmed_flush_lsn,
    wal_status
FROM pg_replication_slots
WHERE active = false
ORDER BY slot_name;

-- ============================================
-- REPLICATION STATISTICS (Run on SOURCE database)
-- ============================================

-- 14. Active replication connections
SELECT 
    application_name,
    client_addr,
    client_hostname,
    state,
    sync_state,
    sent_lsn,
    write_lsn,
    flush_lsn,
    replay_lsn,
    write_lag,
    flush_lag,
    replay_lag,
    backend_start
FROM pg_stat_replication
ORDER BY application_name;

-- 15. Replication lag summary
SELECT 
    application_name,
    state,
    pg_wal_lsn_diff(sent_lsn, replay_lsn) AS lag_bytes,
    pg_size_pretty(pg_wal_lsn_diff(sent_lsn, replay_lsn)::bigint) AS lag_size,
    replay_lag
FROM pg_stat_replication
ORDER BY lag_bytes DESC;

-- ============================================
-- DATABASE OVERVIEW
-- ============================================

-- 16. List all databases with sizes
SELECT 
    datname,
    pg_size_pretty(pg_database_size(datname)) AS size,
    pg_database_size(datname) AS size_bytes
FROM pg_database
WHERE datistemplate = false
ORDER BY pg_database_size(datname) DESC;

-- 17. Total replication overview
SELECT 
    (SELECT COUNT(*) FROM pg_publication) AS total_publications,
    (SELECT COUNT(*) FROM pg_replication_slots) AS total_slots,
    (SELECT COUNT(*) FROM pg_replication_slots WHERE active = true) AS active_slots,
    (SELECT COUNT(*) FROM pg_stat_replication) AS active_connections;

-- ============================================
-- TROUBLESHOOTING
-- ============================================

-- 18. Check for replication conflicts (on TARGET)
SELECT * FROM pg_stat_database_conflicts WHERE datname = current_database();

-- 19. Check WAL sender processes (on SOURCE)
SELECT 
    pid,
    usename,
    application_name,
    client_addr,
    state,
    sent_lsn,
    write_lsn,
    flush_lsn,
    replay_lsn
FROM pg_stat_replication;

-- 20. Check subscription worker processes (on TARGET)
SELECT 
    pid,
    datname,
    usename,
    application_name,
    client_addr,
    wait_event_type,
    wait_event,
    state,
    query
FROM pg_stat_activity
WHERE application_name LIKE '%logical replication%'
   OR query LIKE '%pg_subscription%';

-- ============================================
-- MAINTENANCE
-- ============================================

-- 21. Drop inactive replication slot (CAREFUL!)
-- SELECT pg_drop_replication_slot('slot_name');

-- 22. Refresh subscription (resync)
-- ALTER SUBSCRIPTION my_sub REFRESH PUBLICATION;

-- 23. Drop subscription
-- DROP SUBSCRIPTION my_sub;

-- 24. Drop publication
-- DROP PUBLICATION my_pub;

-- ============================================
-- MONITORING SPECIFIC DATABASES
-- ============================================

-- 25. For each of your 33 databases, you can connect and run:
-- \c database_name
-- SELECT COUNT(*) FROM pg_publication;
-- SELECT COUNT(*) FROM pg_subscription;

-- 26. Check if a specific table is being replicated
SELECT 
    p.pubname,
    pt.schemaname,
    pt.tablename
FROM pg_publication p
JOIN pg_publication_tables pt ON p.pubname = pt.pubname
WHERE pt.tablename = 'your_table_name';
