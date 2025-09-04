#!/bin/bash

# AirGradient Map API Database Setup Script
# This script initializes the database with proper schema and seed data

set -e

# Default values
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-agmap}
DB_USER=${DB_USER:-postgres}
DB_PASSWORD=${DB_PASSWORD:-password}
ENVIRONMENT=${ENVIRONMENT:-development}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if PostgreSQL is accessible
check_postgres() {
    log_info "Checking PostgreSQL connection..."
    if ! PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "SELECT 1;" > /dev/null 2>&1; then
        log_error "Cannot connect to PostgreSQL. Please check your connection parameters."
        exit 1
    fi
    log_info "PostgreSQL connection successful."
}

# Create database if it doesn't exist
create_database() {
    log_info "Creating database '$DB_NAME' if it doesn't exist..."
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 || \
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "CREATE DATABASE $DB_NAME;"
    log_info "Database '$DB_NAME' is ready."
}

# Run SQL file
run_sql_file() {
    local file_path=$1
    local description=$2
    
    if [[ -f $file_path ]]; then
        log_info "Running $description..."
        PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "$file_path"
        log_info "$description completed successfully."
    else
        log_error "File not found: $file_path"
        exit 1
    fi
}

# Check if schema exists
schema_exists() {
    local table_count=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('location', 'measurement');")
    [[ $table_count -eq 2 ]]
}

# Run migrations
run_migrations() {
    log_info "Running database migrations..."
    
    # Get current directory
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    MIGRATIONS_DIR="$SCRIPT_DIR/migrations"
    
    if [[ -d $MIGRATIONS_DIR ]]; then
        for migration_file in "$MIGRATIONS_DIR"/*.sql; do
            if [[ -f $migration_file ]]; then
                local migration_name=$(basename "$migration_file" .sql)
                local already_applied=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM schema_migrations WHERE version = '$migration_name';" 2>/dev/null || echo "0")
                
                if [[ $already_applied -eq 0 ]]; then
                    log_info "Applying migration: $migration_name"
                    run_sql_file "$migration_file" "migration $migration_name"
                else
                    log_info "Migration $migration_name already applied, skipping."
                fi
            fi
        done
    else
        log_warn "Migrations directory not found: $MIGRATIONS_DIR"
    fi
}

# Seed database based on environment
seed_database() {
    local seed_file="database/seeds/${ENVIRONMENT}.sql"
    
    log_info "Seeding database for environment: $ENVIRONMENT"
    
    if [[ -f $seed_file ]]; then
        run_sql_file "$seed_file" "seed data for $ENVIRONMENT"
    else
        log_warn "Seed file not found: $seed_file"
        log_info "Skipping seed data..."
    fi
}

# Verify setup
verify_setup() {
    log_info "Verifying database setup..."
    
    # Check if tables exist
    local location_count=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM location;" 2>/dev/null || echo "0")
    local measurement_count=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM measurement;" 2>/dev/null || echo "0")
    
    log_info "Database verification:"
    log_info "  - Locations: $location_count"
    log_info "  - Measurements: $measurement_count"
    
    # Check indexes
    local index_count=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public';" 2>/dev/null || echo "0")
    log_info "  - Indexes: $index_count"
    
    log_info "Database setup verification completed."
}

# Show usage
usage() {
    echo "Usage: $0 [options]"
    echo "Options:"
    echo "  --init                Initialize schema only"
    echo "  --seed-only          Seed data only (requires existing schema)"
    echo "  --migrate-only       Run migrations only"
    echo "  --reset              Drop and recreate database (DANGEROUS!)"
    echo "  --environment ENV    Set environment (development|test|production)"
    echo "  --help               Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  DB_HOST              Database host (default: localhost)"
    echo "  DB_PORT              Database port (default: 5432)"
    echo "  DB_NAME              Database name (default: agmap)"
    echo "  DB_USER              Database user (default: postgres)"
    echo "  DB_PASSWORD          Database password (default: password)"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Full setup for development"
    echo "  $0 --environment test                # Setup for testing"
    echo "  $0 --init                           # Initialize schema only"
    echo "  $0 --seed-only --environment test   # Seed test data only"
}

# Main function
main() {
    local init_only=false
    local seed_only=false
    local migrate_only=false
    local reset=false
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --init)
                init_only=true
                shift
                ;;
            --seed-only)
                seed_only=true
                shift
                ;;
            --migrate-only)
                migrate_only=true
                shift
                ;;
            --reset)
                reset=true
                shift
                ;;
            --environment)
                ENVIRONMENT=$2
                shift 2
                ;;
            --help)
                usage
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                usage
                exit 1
                ;;
        esac
    done
    
    # Validate environment
    if [[ ! "$ENVIRONMENT" =~ ^(development|test|production)$ ]]; then
        log_error "Invalid environment: $ENVIRONMENT. Must be development, test, or production."
        exit 1
    fi
    
    log_info "Starting database setup for environment: $ENVIRONMENT"
    log_info "Target: $DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"
    
    # Check PostgreSQL connection
    check_postgres
    
    # Reset database if requested
    if [[ $reset == true ]]; then
        log_warn "Resetting database: $DB_NAME"
        read -p "Are you sure? This will delete all data! (y/N): " -r
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"
            log_info "Database $DB_NAME dropped."
        else
            log_info "Database reset cancelled."
            exit 0
        fi
    fi
    
    # Create database
    create_database
    
    # Initialize schema if needed
    if [[ $seed_only == false && $migrate_only == false ]] || [[ $init_only == true ]]; then
        if ! schema_exists; then
            run_sql_file "database/init.sql" "schema initialization"
        else
            log_info "Schema already exists, skipping initialization."
        fi
    fi
    
    # Run migrations
    if [[ $seed_only == false && $init_only == false ]] || [[ $migrate_only == true ]]; then
        run_migrations
    fi
    
    # Seed database
    if [[ $init_only == false && $migrate_only == false ]] || [[ $seed_only == true ]]; then
        seed_database
    fi
    
    # Verify setup
    verify_setup
    
    log_info "Database setup completed successfully!"
    
    # Show connection info
    echo ""
    log_info "Connection details:"
    log_info "  Host: $DB_HOST:$DB_PORT"
    log_info "  Database: $DB_NAME"
    log_info "  User: $DB_USER"
    echo ""
    log_info "You can connect using:"
    echo "  psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME"
}

# Run main function
main "$@"