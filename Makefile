# ══════════════════════════════════════════════════════════════════
#  TransportOS — Makefile
#  Shortcuts for Docker Compose operations
#
#  Prerequisites: Docker Desktop (or Docker Engine + Compose plugin)
# ══════════════════════════════════════════════════════════════════

.PHONY: help setup up down restart logs ps build pull clean nuke

# Default target
help:
	@echo ""
	@echo "  TransportOS — Docker Commands"
	@echo "  ─────────────────────────────────────────────────────────────"
	@echo "  make setup     Copy .env.docker → .env  (first-time setup)"
	@echo "  make up        Build images and start all services"
	@echo "  make down      Stop all services (keeps volumes)"
	@echo "  make restart   Stop then start all services"
	@echo "  make logs      Tail logs from all services"
	@echo "  make ps        Show running containers"
	@echo "  make build     Rebuild images without cache"
	@echo "  make clean     Stop services and remove volumes"
	@echo "  make nuke      Remove everything including images"
	@echo ""

setup:
	@if [ ! -f .env ]; then cp .env.docker .env && echo "✅  .env created — fill in your secrets before running 'make up'"; \
	 else echo "ℹ️   .env already exists — skipping"; fi

up:
	docker compose --env-file .env up --build -d
	@echo ""
	@echo "✅  TransportOS is starting up!"
	@echo "    Frontend   →  http://localhost"
	@echo "    API Gateway→  http://localhost:4000"
	@echo ""
	@echo "    Run 'make logs' to watch service output."

down:
	docker compose down

restart: down up

logs:
	docker compose logs -f --tail=100

ps:
	docker compose ps

build:
	docker compose build --no-cache

clean:
	docker compose down -v
	@echo "✅  Containers and volumes removed."

nuke:
	docker compose down -v --rmi all --remove-orphans
	@echo "✅  Everything removed (containers, volumes, images)."
