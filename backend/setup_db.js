const { Client } = require('pg');

const password = encodeURIComponent('vEXD.WSm8*?pt2_');
const connectionString = `postgresql://postgres:${password}@db.cfmatgzyeeymzykqrudp.supabase.co:5432/postgres`;

const sql = `
-- Create jobs table
CREATE TABLE IF NOT EXISTS public.jobs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  title text,
  details text,
  price_min numeric,
  price_max numeric,
  attachments jsonb DEFAULT '[]'::jsonb,
  category text,
  subcategories jsonb DEFAULT '[]'::jsonb,
  location text,
  status text DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create proposals table
CREATE TABLE IF NOT EXISTS public.proposals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id uuid REFERENCES public.jobs(id) ON DELETE CASCADE,
  tasker_id uuid REFERENCES auth.users(id),
  message text,
  price numeric,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create reviews table
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  target_id uuid REFERENCES auth.users(id),
  reviewer_id uuid REFERENCES auth.users(id),
  job_id uuid REFERENCES public.jobs(id) ON DELETE CASCADE,
  rating numeric NOT NULL,
  comment text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Disable strict RLS enforcement for rapid development (Or add simple "ALL" policies)
DO $$
BEGIN
    DROP POLICY IF EXISTS "Enable all access for jobs" ON public.jobs;
    DROP POLICY IF EXISTS "Enable all access for proposals" ON public.proposals;
    DROP POLICY IF EXISTS "Enable all access for reviews" ON public.reviews;
    
    CREATE POLICY "Enable all access for jobs" ON public.jobs FOR ALL USING (true) WITH CHECK (true);
    CREATE POLICY "Enable all access for proposals" ON public.proposals FOR ALL USING (true) WITH CHECK (true);
    CREATE POLICY "Enable all access for reviews" ON public.reviews FOR ALL USING (true) WITH CHECK (true);
END
$$;

-- Attempt to enable realtime for proposals and jobs (ignoring error if already exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'proposals'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.proposals;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'jobs'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.jobs;
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- Suppress errors if publication doesn't exist or table is already added
END
$$;
`;

async function run() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log("Connected successfully!");
    await client.query(sql);
    console.log("Schema injected successfully.");
  } catch (err) {
    console.error("Error setting up DB:", err);
  } finally {
    await client.end();
  }
}

run();
