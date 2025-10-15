# Deployment Guide

Guide for deploying the PostgreSQL Replication Monitor in production.

## Prerequisites

- Go 1.21+ installed on the monitoring server
- Network access to both source and target RDS instances
- PostgreSQL user with appropriate permissions
- SSL/TLS certificates for secure connections

## Required PostgreSQL Permissions

The monitoring user needs these permissions:

```sql
-- On both source and target databases
GRANT CONNECT ON DATABASE your_database TO monitoring_user;
GRANT USAGE ON SCHEMA pg_catalog TO monitoring_user;

-- Read-only access to replication views
GRANT SELECT ON pg_replication_slots TO monitoring_user;
GRANT SELECT ON pg_publication TO monitoring_user;
GRANT SELECT ON pg_publication_tables TO monitoring_user;
GRANT SELECT ON pg_subscription TO monitoring_user;
GRANT SELECT ON pg_stat_subscription TO monitoring_user;
GRANT SELECT ON pg_settings TO monitoring_user;
GRANT SELECT ON pg_replication_origin TO monitoring_user;

-- Allow execution of LSN functions
GRANT EXECUTE ON FUNCTION pg_current_wal_lsn() TO monitoring_user;
GRANT EXECUTE ON FUNCTION pg_wal_lsn_diff(pg_lsn, pg_lsn) TO monitoring_user;
```

## Deployment Options

### Option 1: EC2 Instance

1. **Launch EC2 Instance**
   - Amazon Linux 2 or Ubuntu
   - t3.small or larger
   - Same VPC as RDS instances
   - Security group allowing inbound on port 8080

2. **Install Go**
   ```bash
   wget https://go.dev/dl/go1.21.0.linux-amd64.tar.gz
   sudo tar -C /usr/local -xzf go1.21.0.linux-amd64.tar.gz
   echo 'export PATH=$PATH:/usr/local/bin/go/bin' >> ~/.bashrc
   source ~/.bashrc
   ```

3. **Deploy Application**
   ```bash
   # Clone or copy application
   git clone <your-repo> /opt/monitoring-replication
   cd /opt/monitoring-replication
   
   # Build
   make build
   
   # Create config
   sudo cp config.yaml /etc/monitoring-replication/config.yaml
   sudo chmod 600 /etc/monitoring-replication/config.yaml
   sudo vi /etc/monitoring-replication/config.yaml
   ```

4. **Create Systemd Service**
   ```bash
   sudo vi /etc/systemd/system/replication-monitor.service
   ```
   
   ```ini
   [Unit]
   Description=PostgreSQL Replication Monitor
   After=network.target
   
   [Service]
   Type=simple
   User=monitoring
   Group=monitoring
   WorkingDirectory=/opt/monitoring-replication
   ExecStart=/opt/monitoring-replication/bin/monitor -config /etc/monitoring-replication/config.yaml
   Restart=always
   RestartSec=10
   
   [Install]
   WantedBy=multi-user.target
   ```
   
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable replication-monitor
   sudo systemctl start replication-monitor
   sudo systemctl status replication-monitor
   ```

### Option 2: Docker Container

1. **Create Dockerfile**
   ```dockerfile
   FROM golang:1.21-alpine AS builder
   
   WORKDIR /app
   COPY go.mod go.sum ./
   RUN go mod download
   
   COPY . .
   RUN go build -o monitor cmd/monitor/main.go
   
   FROM alpine:latest
   RUN apk --no-cache add ca-certificates
   
   WORKDIR /root/
   COPY --from=builder /app/monitor .
   COPY --from=builder /app/web ./web
   
   EXPOSE 8080
   
   CMD ["./monitor", "-config", "/config/config.yaml"]
   ```

2. **Build and Run**
   ```bash
   docker build -t replication-monitor .
   
   docker run -d \
     --name replication-monitor \
     -p 8080:8080 \
     -v /path/to/config.yaml:/config/config.yaml:ro \
     --restart unless-stopped \
     replication-monitor
   ```

### Option 3: ECS/Fargate

1. **Create Task Definition**
   ```json
   {
     "family": "replication-monitor",
     "networkMode": "awsvpc",
     "requiresCompatibilities": ["FARGATE"],
     "cpu": "256",
     "memory": "512",
     "containerDefinitions": [
       {
         "name": "monitor",
         "image": "your-ecr-repo/replication-monitor:latest",
         "portMappings": [
           {
             "containerPort": 8080,
             "protocol": "tcp"
           }
         ],
         "secrets": [
           {
             "name": "CONFIG",
             "valueFrom": "arn:aws:secretsmanager:region:account:secret:monitor-config"
           }
         ],
         "logConfiguration": {
           "logDriver": "awslogs",
           "options": {
             "awslogs-group": "/ecs/replication-monitor",
             "awslogs-region": "us-east-1",
             "awslogs-stream-prefix": "ecs"
           }
         }
       }
     ]
   }
   ```

## Security Configuration

### 1. Secure Database Credentials

Use AWS Secrets Manager:

```bash
# Store credentials
aws secretsmanager create-secret \
  --name replication-monitor/db-credentials \
  --secret-string '{
    "source_password": "xxx",
    "target_password": "yyy"
  }'
```

Update application to read from Secrets Manager (requires code modification).

### 2. SSL/TLS for Database Connections

Update config.yaml:
```yaml
databases:
  - name: "source-db"
    host: "source.rds.amazonaws.com"
    # ... other settings ...
    ssl_mode: "require"  # or "verify-full"
    ssl_root_cert: "/path/to/rds-ca-bundle.pem"
```

Download RDS CA bundle:
```bash
wget https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem
```

### 3. Secure Dashboard Access

#### Option A: Use Application Load Balancer with Authentication

1. Create ALB with HTTPS listener
2. Configure Cognito or OIDC authentication
3. Forward to monitoring service

#### Option B: Use VPN/Bastion

1. Deploy in private subnet
2. Access via VPN or bastion host
3. No public internet access

#### Option C: Add Basic Auth (requires code modification)

Add middleware to server.go for basic authentication.

## Network Configuration

### Security Group Rules

**Monitoring Server Security Group:**
- Inbound: 8080 from your IP/VPN (for dashboard)
- Outbound: 5432 to RDS security groups

**RDS Security Groups:**
- Inbound: 5432 from monitoring server security group

### VPC Configuration

- Deploy monitoring server in same VPC as RDS instances
- Use VPC peering if databases are in different VPCs
- Ensure route tables allow communication

## Monitoring the Monitor

### CloudWatch Logs

```bash
# Create log group
aws logs create-log-group --log-group-name /app/replication-monitor

# Configure application to send logs
# Add to systemd service:
StandardOutput=journal
StandardError=journal
```

### Health Checks

Create a health check endpoint (requires code modification):

```go
// Add to server.go
s.router.HandleFunc("/health", s.handleHealth).Methods("GET")

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
    w.WriteHeader(http.StatusOK)
    w.Write([]byte("OK"))
}
```

### CloudWatch Alarms

Monitor the monitoring service:

```bash
# Create alarm for service health
aws cloudwatch put-metric-alarm \
  --alarm-name replication-monitor-health \
  --alarm-description "Alert if monitor is down" \
  --metric-name HealthCheckStatus \
  --namespace AWS/ApplicationELB \
  --statistic Average \
  --period 60 \
  --evaluation-periods 2 \
  --threshold 1 \
  --comparison-operator LessThanThreshold
```

## Backup and Recovery

### Configuration Backup

```bash
# Backup config
aws s3 cp /etc/monitoring-replication/config.yaml \
  s3://your-backup-bucket/monitoring-replication/config.yaml

# Restore config
aws s3 cp s3://your-backup-bucket/monitoring-replication/config.yaml \
  /etc/monitoring-replication/config.yaml
```

### Application Updates

```bash
# Zero-downtime update
cd /opt/monitoring-replication
git pull
make build

# Restart service
sudo systemctl restart replication-monitor

# Verify
sudo systemctl status replication-monitor
curl http://localhost:8080/api/snapshot
```

## Performance Tuning

### Database Connection Pooling

Already configured in monitor.go:
```go
db.SetMaxOpenConns(10)
db.SetMaxIdleConns(5)
db.SetConnMaxLifetime(time.Minute * 5)
```

Adjust based on your needs.

### Refresh Interval

For production with many databases:
```yaml
server:
  refresh_interval: 10  # Increase to reduce load
```

### Resource Requirements

**Minimum:**
- CPU: 0.25 vCPU
- Memory: 512 MB
- Disk: 1 GB

**Recommended (10+ databases):**
- CPU: 1 vCPU
- Memory: 2 GB
- Disk: 5 GB

## Scaling

### Multiple Databases

The application handles multiple databases efficiently:
- Parallel data collection
- Connection pooling per database
- Configurable refresh intervals

### High Availability

Deploy multiple instances behind a load balancer:
1. Each instance connects to databases independently
2. Load balancer distributes dashboard traffic
3. No shared state between instances

## Troubleshooting

### Check Logs

```bash
# Systemd
sudo journalctl -u replication-monitor -f

# Docker
docker logs -f replication-monitor

# ECS
aws logs tail /ecs/replication-monitor --follow
```

### Common Issues

**Connection Timeout:**
- Check security groups
- Verify RDS endpoints
- Test with psql from monitoring server

**High Memory Usage:**
- Reduce refresh_interval
- Decrease connection pool size
- Check for memory leaks

**Slow Dashboard:**
- Increase refresh_interval
- Optimize database queries
- Check network latency

## Maintenance

### Regular Tasks

1. **Monitor disk space**
   ```bash
   df -h
   ```

2. **Check service health**
   ```bash
   sudo systemctl status replication-monitor
   ```

3. **Review logs for errors**
   ```bash
   sudo journalctl -u replication-monitor --since "1 hour ago" | grep -i error
   ```

4. **Update dependencies**
   ```bash
   cd /opt/monitoring-replication
   go get -u ./...
   go mod tidy
   make build
   sudo systemctl restart replication-monitor
   ```

### Upgrade Procedure

1. Backup current version
2. Pull new code
3. Run tests
4. Build new binary
5. Restart service
6. Verify functionality

## Cost Optimization

- Use t3.micro for small deployments
- Use Fargate Spot for non-critical monitoring
- Stop monitoring after migration completes
- Use reserved instances for long-term monitoring

## Compliance and Auditing

- Enable CloudTrail for API calls
- Log all database connections
- Encrypt config files at rest
- Use IAM roles instead of credentials where possible
- Regular security audits of access logs
