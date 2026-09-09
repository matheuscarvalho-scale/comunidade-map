-- Create enum for secondary login request status
CREATE TYPE public.secondary_login_status AS ENUM ('pending', 'approved', 'rejected');

-- Create table for secondary login requests
CREATE TABLE public.secondary_login_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  secondary_email TEXT NOT NULL,
  secondary_name TEXT NOT NULL,
  relationship TEXT NOT NULL,
  justification TEXT,
  status public.secondary_login_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.secondary_login_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests
CREATE POLICY "Users can view own requests"
ON public.secondary_login_requests
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own requests
CREATE POLICY "Users can create own requests"
ON public.secondary_login_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view all requests
CREATE POLICY "Admins can view all requests"
ON public.secondary_login_requests
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update requests (approve/reject)
CREATE POLICY "Admins can update requests"
ON public.secondary_login_requests
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_secondary_login_requests_updated_at
BEFORE UPDATE ON public.secondary_login_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Create table for approved secondary logins (linked accounts)
CREATE TABLE public.secondary_logins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  secondary_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  secondary_email TEXT NOT NULL,
  secondary_name TEXT NOT NULL,
  relationship TEXT NOT NULL,
  request_id UUID REFERENCES public.secondary_login_requests(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.secondary_logins ENABLE ROW LEVEL SECURITY;

-- Users can view their own secondary logins
CREATE POLICY "Users can view own secondary logins"
ON public.secondary_logins
FOR SELECT
USING (auth.uid() = primary_user_id OR auth.uid() = secondary_user_id);

-- Admins can manage all secondary logins
CREATE POLICY "Admins can manage secondary logins"
ON public.secondary_logins
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_secondary_logins_updated_at
BEFORE UPDATE ON public.secondary_logins
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();