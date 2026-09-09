
-- Create partner_clicks table
CREATE TABLE public.partner_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_email text,
  user_name text,
  user_plan text,
  partner_name text NOT NULL,
  benefit_type text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  clicked_at timestamptz DEFAULT now(),
  status text DEFAULT 'aguardando',
  purchase_value numeric,
  cashback_value numeric,
  cashback_applied boolean DEFAULT false
);

-- Enable RLS
ALTER TABLE public.partner_clicks ENABLE ROW LEVEL SECURITY;

-- Users can insert their own clicks
CREATE POLICY "Users can insert own clicks"
  ON public.partner_clicks
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can read their own clicks
CREATE POLICY "Users can read own clicks"
  ON public.partner_clicks
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can read all clicks
CREATE POLICY "Admins can read all clicks"
  ON public.partner_clicks
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update all clicks
CREATE POLICY "Admins can update all clicks"
  ON public.partner_clicks
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Service role bypass for edge functions (uses service_role key)
CREATE POLICY "Service role full access"
  ON public.partner_clicks
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
