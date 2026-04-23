.PHONY: help docker-build docker-run docker-stop docker-rm docker-logs docker-restart compose-up compose-down compose-logs compose-rebuild

IMAGE_NAME ?= liteflow-frontend
CONTAINER_NAME ?= liteflow-frontend
PORT ?= 3000

help:
	@echo "Available targets:"
	@echo "  make docker-build     Build Docker image ($(IMAGE_NAME))"
	@echo "  make docker-run       Run container ($(CONTAINER_NAME)) on port $(PORT)"
	@echo "  make docker-stop      Stop running container"
	@echo "  make docker-rm        Remove container"
	@echo "  make docker-logs      Follow container logs"
	@echo "  make docker-restart   Restart container (stop + rm + run)"
	@echo "  make compose-up       Start services via docker compose"
	@echo "  make compose-down     Stop services via docker compose"
	@echo "  make compose-logs     Follow compose logs"
	@echo "  make compose-rebuild  Rebuild and restart compose services"

docker-build:
	docker build -t $(IMAGE_NAME):latest .

docker-run:
	docker run -d --name $(CONTAINER_NAME) -p $(PORT):3000 $(IMAGE_NAME):latest

docker-stop:
	- docker stop $(CONTAINER_NAME)

docker-rm:
	- docker rm $(CONTAINER_NAME)

docker-logs:
	docker logs -f $(CONTAINER_NAME)

docker-restart: docker-stop docker-rm docker-run

compose-up:
	docker compose up -d

compose-down:
	docker compose down

compose-logs:
	docker compose logs -f

compose-rebuild:
	docker compose up -d --build
