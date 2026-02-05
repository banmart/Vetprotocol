#!/bin/bash
cd /root/Vetprotocol
# Load environment variables from .env file or set them before running
# export NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
# export NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
# export SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
npx tsx scripts/master-exam-runner.ts
