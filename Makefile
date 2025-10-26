.PHONY: help install build run dev clean

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install dependencies
	@echo "Installing Go dependencies..."
	go mod download

build: ## Build the application
	@echo "Building application..."
	go build -o monitor main.go
	@echo "Build complete! Binary: ./monitor"

run: ## Run the application
	@echo "Starting PostgreSQL Replication Monitor..."
	go run main.go

dev: ## Run in development mode
	@echo "Starting server..."
	go run main.go

clean: ## Clean build artifacts
	@echo "Cleaning..."
	rm -f monitor
	@echo "Clean complete!"

test: ## Run tests
	go test -v ./...

docker-build: ## Build Docker image
	docker build -t pg-replication-monitor:latest .

docker-run: ## Run Docker container
	docker run -p 8080:8080 --env-file .env pg-replication-monitor:latest
