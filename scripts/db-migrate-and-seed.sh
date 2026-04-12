#!/bin/bash
# Database migration and seeding script for Render deployments
# This script can be run manually via Render Shell if needed

set -e  # Exit on error

echo "🔄 Starting database setup..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL is not set"
    exit 1
fi

echo "✅ DATABASE_URL is set"

# Run Prisma migrations
echo "📊 Running Prisma migrations..."
npx prisma migrate deploy

echo "✅ Migrations complete"

# Run seeding (idempotent - checks if already seeded)
echo "🌱 Running database seeding..."
npx tsx prisma/seed.ts

echo "✅ Seeding complete"

echo "🎉 Database setup finished successfully!"

# Optional: Verify database state
if [ "$1" = "--verify" ]; then
    echo "🔍 Verifying database state..."
    
    # Count trainers
    TRAINER_COUNT=$(npx prisma trainer count 2>/dev/null || echo "0")
    echo "Trainers in database: $TRAINER_COUNT"
    
    # Count projects
    PROJECT_COUNT=$(npx prisma project count 2>/dev/null || echo "0")
    echo "Projects in database: $PROJECT_COUNT"
    
    # Count courses
    COURSE_COUNT=$(npx prisma course count 2>/dev/null || echo "0")
    echo "Courses in database: $COURSE_COUNT"
    
    # Count quizzes
    QUIZ_COUNT=$(npx prisma quiz count 2>/dev/null || echo "0")
    echo "Quizzes in database: $QUIZ_COUNT"
    
    if [ "$TRAINER_COUNT" -gt 0 ] && [ "$PROJECT_COUNT" -gt 0 ]; then
        echo "✅ Database appears to be properly seeded"
    else
        echo "⚠️  Database may not be fully seeded"
    fi
fi