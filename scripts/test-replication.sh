#!/bin/bash
# Test replication by inserting data and checking replication status

set -e

echo "Testing replication..."

# Insert test data on source
echo "Inserting test data on source database..."
PGPASSWORD=postgres psql -h localhost -p 5432 -U postgres -d testdb <<EOF
INSERT INTO test_data (data) 
VALUES ('Test at ' || NOW());

SELECT COUNT(*) as source_count FROM test_data;
EOF

# Wait a moment for replication
echo "Waiting for replication..."
sleep 2

# Check data on target
echo "Checking data on target database..."
PGPASSWORD=postgres psql -h localhost -p 5433 -U postgres -d testdb <<EOF
SELECT COUNT(*) as target_count FROM test_data;
EOF

# Check replication stats
echo ""
echo "Replication statistics:"
PGPASSWORD=postgres psql -h localhost -p 5432 -U postgres -d testdb <<EOF
SELECT 
    slot_name,
    active,
    pg_current_wal_lsn() as current_lsn,
    confirmed_flush_lsn,
    pg_wal_lsn_diff(pg_current_wal_lsn(), confirmed_flush_lsn) as lag_bytes
FROM pg_replication_slots
WHERE slot_type = 'logical';
EOF

echo ""
echo "✅ Replication test complete!"
echo "Check the dashboard at http://localhost:8080 to see real-time stats"
