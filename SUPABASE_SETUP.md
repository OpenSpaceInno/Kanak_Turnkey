# Supabase Setup Guide

## Step 1: Get Your Supabase Connection String

1. Go to your Supabase project dashboard
2. Click on "Project Settings" (gear icon)
3. Go to "Database" section
4. Find "Connection string" and select "URI" mode
5. Copy the connection string (it should look like):
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxxx.supabase.co:5432/postgres
   ```

## Step 2: Update Environment Variables

Update the `.env` file in the project root:

```env
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxxx.supabase.co:5432/postgres
NODE_ENV=development
PORT=3000
```

## Step 3: Push Database Schema

Run this command to create all tables in Supabase:

```cmd
cd lib\db
pnpm run push
```

This will create all tables (users, leads, projects, tasks, finance, procurement, etc.)

## Step 4: Restart the API Server

Stop and restart the API server to connect to Supabase:

```cmd
cd artifacts\api-server
pnpm run dev
```

The server will:
- Connect to Supabase PostgreSQL
- Run the seed script automatically
- Create sample data (users, leads, projects, etc.)

## Step 5: Verify the Setup

1. Check the API server console - you should see:
   ```
   ✅ Connected to PostgreSQL database
   📊 Seeding database
   ✅ Server listening on port 3000
   ```

2. Open the frontend at http://localhost:5173/
3. Navigate through all pages - they should now show sample data!

## Troubleshooting

### If you see "Database not available":
- Check that your DATABASE_URL in .env is correct
- Verify your Supabase project is active
- Check that your IP is allowed in Supabase (Project Settings > Database > Connection pooler)

### If seed fails:
- The tables might already have data
- Clear the database and run `pnpm run push-force` in lib/db

### If you get connection errors:
- Check your Supabase password is correct in the connection string
- Verify your network can reach Supabase (try pinging db.xxxxxxxxxxxxx.supabase.co)
