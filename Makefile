.PHONY: build run clean test deps

# Build the application
build:
	@echo "Building monitor..."
	@mkdir -p bin
	@go build -buildvcs=false -o bin/monitor cmd/monitor/main.go
	@echo "Build complete: bin/monitor"

# Run the application
run:
	@go run cmd/monitor/main.go -config config.yaml

# Run with custom config
run-local:
	@go run cmd/monitor/main.go -config config.yaml.local

# Run with Docker config
run-docker:
	@go run cmd/monitor/main.go -config config.docker.yaml

# Clean build artifacts
clean:
	@echo "Cleaning..."
	@rm -rf bin/
	@echo "Clean complete"

# Download dependencies
deps:
	@echo "Downloading dependencies..."
	@go mod download
	@go mod tidy
	@echo "Dependencies updated"

# Run tests
test:
	@echo "Running tests..."
	@go test -v ./...

# Format code
fmt:
	@echo "Formatting code..."
	@go fmt ./...

# Run linter
lint:
	@echo "Running linter..."
	@golangci-lint run

# Install the binary
install: build
	@echo "Installing to /usr/local/bin..."
	@cp bin/monitor /usr/local/bin/
	@echo "Installation complete"

# Create a release build
release:
	@echo "Building release..."
	@mkdir -p bin
	@GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o bin/monitor-linux-amd64 cmd/monitor/main.go
	@GOOS=darwin GOARCH=amd64 go build -ldflags="-s -w" -o bin/monitor-darwin-amd64 cmd/monitor/main.go
	@GOOS=darwin GOARCH=arm64 go build -ldflags="-s -w" -o bin/monitor-darwin-arm64 cmd/monitor/main.go
	@GOOS=windows GOARCH=amd64 go build -ldflags="-s -w" -o bin/monitor-windows-amd64.exe cmd/monitor/main.go
	@echo "Release builds complete"

# Docker commands
docker-up:
	@echo "Starting Docker containers..."
	@docker-compose up -d
	@echo "Waiting for databases to be ready..."
	@sleep 5
	@echo "Docker containers started"

docker-down:
	@echo "Stopping Docker containers..."
	@docker-compose down
	@echo "Docker containers stopped"

docker-setup:
	@echo "Setting up test replication..."
	@./scripts/setup-test-replication.sh

docker-test:
	@echo "Testing replication..."
	@./scripts/test-replication.sh

docker-logs:
	@docker-compose logs -f

# Complete Docker workflow
docker-demo: docker-up docker-setup
	@echo ""
	@echo "✅ Demo environment ready!"
	@echo "Run 'make run-docker' to start the monitor"
	@echo "Then open http://localhost:8080"

# Help
help:
	@echo "Available targets:"
	@echo "  build         - Build the application"
	@echo "  run           - Run the application with default config"
	@echo "  run-local     - Run with config.yaml.local"
	@echo "  run-docker    - Run with Docker test environment"
	@echo "  clean         - Remove build artifacts"
	@echo "  deps          - Download and tidy dependencies"
	@echo "  test          - Run tests"
	@echo "  fmt           - Format code"
	@echo "  lint          - Run linter"
	@echo "  install       - Install binary to /usr/local/bin"
	@echo "  release       - Build for multiple platforms"
	@echo "  docker-up     - Start Docker test databases"
	@echo "  docker-down   - Stop Docker test databases"
	@echo "  docker-setup  - Setup test replication"
	@echo "  docker-test   - Test replication"
	@echo "  docker-demo   - Complete Docker demo setup"
	@echo "  help          - Show this help message"
