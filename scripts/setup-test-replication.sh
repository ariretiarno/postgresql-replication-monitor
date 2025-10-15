#!/bin/bash
# Setup test replication between Docker containers

set -e

echo "Setting up test replication..."

# Wait for databases to be ready
echo "Waiting for databases to be ready..."
sleep 5

# Source database setup
echo "Setting up source database..."
PGPASSWORD=postgres psql -h localhost -p 5432 -U postgres -d testdb <<EOF
-- Create test table
CREATE TABLE IF NOT EXISTS test_data (
    id SERIAL PRIMARY KEY,
    data TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert some test data
INSERT INTO test_data (data) 
SELECT 'Test data ' || generate_series(1, 100);

-- Create publication
DROP PUBLICATION IF EXISTS test_pub;
CREATE PUBLICATION test_pub FOR ALL TABLES;

-- Create replication slot
SELECT pg_drop_replication_slot('test_slot') FROM pg_replication_slots WHERE slot_name = 'test_slot';
SELECT pg_create_logical_replication_slot('test_slot', 'pgoutput');

-- Verify
SELECT * FROM pg_publication;
SELECT * FROM pg_replication_slots;
EOF

# Target database setup
echo "Setting up target database..."
PGPASSWORD=postgres psql -h localhost -p 5433 -U postgres -d testdb <<EOF
-- Create test table (same structure)
CREATE TABLE IF NOT EXISTS test_data (
    id SERIAL PRIMARY KEY,
    data TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Copy initial data (simulating snapshot restore)
-- In real scenario, this would be done via pg_dump/restore
EOF

# Copy data from source to target
echo "Copying initial data..."
PGPASSWORD=postgres pg_dump -h localhost -p 5432 -U postgres -d testdb -t test_data --data-only | \
PGPASSWORD=postgres psql -h localhost -p 5433 -U postgres -d testdb

# Create subscription on target
echo "Creating subscription on target..."
PGPASSWORD=postgres psql -h localhost -p 5433 -U postgres -d testdb <<EOF
-- Drop existing subscription if exists
DROP SUBSCRIPTION IF EXISTS test_sub;

-- Create subscription
CREATE SUBSCRIPTION test_sub
CONNECTION 'host=source-db port=5432 user=postgres password=postgres dbname=testdb'
PUBLICATION test_pub
WITH (
    create_slot = false,
    slot_name = 'test_slot'
);

-- Verify
SELECT * FROM pg_subscription;
SELECT * FROM pg_stat_subscription;
EOF

echo ""
echo "✅ Test replication setup complete!"
echo ""
echo "You can now:"
echo "1. Start the monitor: make run-docker"
echo "2. Open dashboard: http://localhost:8080"
echo "3. Test replication by inserting data on source:"
echo "   PGPASSWORD=postgres psql -h localhost -p 5432 -U postgres -d testdb"
echo "   INSERT INTO test_data (data) VALUES ('New test data');"
echo ""
