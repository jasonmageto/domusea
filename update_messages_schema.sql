-- SQL to update 'messages' table for the new messaging system
-- Run this in your Supabase SQL Editor

-- 1. Ensure the table exists and has all required columns
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    from_id UUID NOT NULL,
    from_name TEXT,
    from_email TEXT,
    to_id UUID NOT NULL,
    to_name TEXT,
    to_email TEXT,
    admin_id UUID,
    tenant_id UUID,
    subject TEXT DEFAULT 'Message',
    message TEXT NOT NULL,
    date TIMESTAMPTZ DEFAULT now(),
    read BOOLEAN DEFAULT false
);

-- 2. Add any missing columns if the table already existed
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='from_name') THEN
        ALTER TABLE public.messages ADD COLUMN from_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='from_email') THEN
        ALTER TABLE public.messages ADD COLUMN from_email TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='to_name') THEN
        ALTER TABLE public.messages ADD COLUMN to_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='to_email') THEN
        ALTER TABLE public.messages ADD COLUMN to_email TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='admin_id') THEN
        ALTER TABLE public.messages ADD COLUMN admin_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='tenant_id') THEN
        ALTER TABLE public.messages ADD COLUMN tenant_id UUID;
    END IF;
END $$;

-- 3. Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies

-- Policy: Users can see messages they sent or received
DROP POLICY IF EXISTS "Users can view their own messages" ON public.messages;
CREATE POLICY "Users can view their own messages" ON public.messages
FOR SELECT USING (
    auth.uid() = from_id OR auth.uid() = to_id
);

-- Policy: Users can insert messages where they are the sender
DROP POLICY IF EXISTS "Users can insert their own messages" ON public.messages;
CREATE POLICY "Users can insert their own messages" ON public.messages
FOR INSERT WITH CHECK (
    auth.uid() = from_id
);

-- Policy: Users can update 'read' status for messages sent to them
DROP POLICY IF EXISTS "Users can update read status" ON public.messages;
CREATE POLICY "Users can update read status" ON public.messages
FOR UPDATE USING (
    auth.uid() = to_id
) WITH CHECK (
    auth.uid() = to_id
);

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_from_id ON public.messages(from_id);
CREATE INDEX IF NOT EXISTS idx_messages_to_id ON public.messages(to_id);
CREATE INDEX IF NOT EXISTS idx_messages_date ON public.messages(date DESC);
