
-- Add foreign key from extra_benefits.member_id to profiles.user_id
ALTER TABLE public.extra_benefits
  ADD CONSTRAINT extra_benefits_member_id_fkey
  FOREIGN KEY (member_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
