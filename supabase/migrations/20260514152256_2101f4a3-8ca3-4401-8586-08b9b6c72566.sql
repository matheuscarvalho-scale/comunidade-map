-- 1. Create private profile table
CREATE TABLE IF NOT EXISTS public.profiles_private (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Migrate existing phone data
INSERT INTO public.profiles_private (user_id, phone)
SELECT user_id, phone FROM public.profiles WHERE phone IS NOT NULL
ON CONFLICT (user_id) DO UPDATE SET phone = EXCLUDED.phone;

-- 3. Enable RLS
ALTER TABLE public.profiles_private ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own private data"
ON public.profiles_private FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own private data"
ON public.profiles_private FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own private data"
ON public.profiles_private FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all private data"
ON public.profiles_private FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all private data"
ON public.profiles_private FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. Trigger updated_at
CREATE TRIGGER update_profiles_private_updated_at
BEFORE UPDATE ON public.profiles_private
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 5. Drop phone from profiles (public table)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS phone;