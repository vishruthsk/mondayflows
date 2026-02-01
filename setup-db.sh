#!/bin/bash

# Database setup script for Instagram Automation Platform

echo "🔧 Setting up PostgreSQL database..."

# Database credentials from .env
DB_NAME="instagram_automation"
DB_USER="postgres"
DB_PASSWORD="v1shbuildmen8n!"

# Create database
echo "Creating database: $DB_NAME"
PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -h localhost -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || echo "Database may already exist"

echo "✅ Database setup complete!"
echo ""
echo "Next steps:"
echo "1. Run: npm run db:migrate"
echo "2. Run: npm run dev"
