#!/bin/bash

set -e

ENV=${1:-dev}

case $ENV in
  dev)
    echo "Deploying DEVELOPMENT..."
    docker compose -f docker-compose.yml -f docker-compose.dev.yml --env-file .env.dev up -d
    ;;
  prod)
    echo "Deploying PRODUCTION..."
    docker compose --env-file .env.prod up -d --build
    ;;
  stop)
    echo "Stopping services..."
    docker compose down
    ;;
  logs)
    docker compose logs -f
    ;;
  status)
    docker compose ps
    ;;
  *)
    echo "Usage: $0 {dev|prod|stop|logs|status}"
    exit 1
    ;;
esac

echo "Done!"
docker compose ps