-- Create the challenges table
CREATE TABLE IF NOT EXISTS public.challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    text TEXT NOT NULL,
    date DATE UNIQUE, -- Optional: If NULL, it can be a pool of generic challenges
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

-- Allow everyone to READ challenges (Authenticated users)
CREATE POLICY "Enable read access for authenticated users" ON public.challenges
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow only service_role (or admins if you had them) to INSERT/UPDATE
-- implied by default deny, but here explicitly no policy needed for anon/authenticated writes.

-- Seed specific challenges for the next few days (Example)
-- INSERT INTO public.challenges (text, date) VALUES 
-- ('Do 20 burpees', '2026-01-05'),
-- ('Run 1km', '2026-01-06');

-- Seed pool of generic challenges (date IS NULL)
INSERT INTO public.challenges (text) VALUES
    ('Do 20 pushups'),
    ('Drink 2L of water'),
    ('Walk 10,000 steps'),
    ('Do 50 jumping jacks'),
    ('Hold a plank for 1 minute'),
    ('Stretch for 10 minutes'),
    ('Eat a piece of fruit'),
    ('Do 15 squats'),
    ('Take the stairs today'),
    ('No sugar for the rest of the day'),
    ('Do 20 lunges'),
    ('Meditate for 5 minutes'),
    ('Stand up every hour'),
    ('Go for a 15 minute walk'),
    ('Do 10 burpees')
ON CONFLICT DO NOTHING;
