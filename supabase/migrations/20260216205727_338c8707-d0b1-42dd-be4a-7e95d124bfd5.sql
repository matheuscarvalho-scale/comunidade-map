
CREATE OR REPLACE FUNCTION public.search_profiles_with_email(search_query text)
RETURNS TABLE(user_id uuid, name text, bio text, avatar_url text, email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT p.user_id, p.name, p.bio, p.avatar_url, au.email::text
  FROM public.profiles p
  JOIN auth.users au ON au.id = p.user_id
  WHERE p.name ILIKE '%' || search_query || '%'
  LIMIT 10;
END;
$function$;
