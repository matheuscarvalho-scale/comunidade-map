-- Add user_created_id column to webhook_logs table
ALTER TABLE public.webhook_logs 
ADD COLUMN IF NOT EXISTS user_created_id uuid;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_webhook_logs_status ON public.webhook_logs(status);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON public.webhook_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_provider ON public.webhook_logs(provider);

-- Allow service role to insert logs (for edge functions)
CREATE POLICY "Service role can insert webhook logs" 
ON public.webhook_logs 
FOR INSERT 
WITH CHECK (true);

-- Update existing policy to allow service role full access
CREATE POLICY "Service role can update webhook logs" 
ON public.webhook_logs 
FOR UPDATE 
USING (true);
