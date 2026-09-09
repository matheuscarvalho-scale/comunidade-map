
-- Auto-unlock "Membro Fundador" for existing qualifying users
DO $$
DECLARE
  v_achievement_id uuid := '368a54e0-4efa-438d-98d3-1cb2772dcaaf';
  v_user record;
BEGIN
  FOR v_user IN
    SELECT DISTINCT ur.user_id
    FROM user_roles ur
    JOIN profiles p ON p.user_id = ur.user_id
    WHERE ur.role IN ('starter', 'pro', 'enterprise')
      AND p.created_at < '2026-05-21T00:00:00Z'
  LOOP
    INSERT INTO user_achievements (user_id, achievement_id, progress, unlocked_at)
    VALUES (v_user.user_id, v_achievement_id, 1, now())
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
  END LOOP;
END $$;

-- Create trigger function to auto-unlock for new qualifying users
CREATE OR REPLACE FUNCTION public.check_founding_member_achievement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_achievement_id uuid := '368a54e0-4efa-438d-98d3-1cb2772dcaaf';
  v_profile_created timestamptz;
BEGIN
  IF NEW.role NOT IN ('starter', 'pro', 'enterprise') THEN
    RETURN NEW;
  END IF;

  SELECT created_at INTO v_profile_created
  FROM profiles
  WHERE user_id = NEW.user_id;

  IF v_profile_created IS NOT NULL AND v_profile_created < '2026-05-21T00:00:00Z' THEN
    INSERT INTO user_achievements (user_id, achievement_id, progress, unlocked_at)
    VALUES (NEW.user_id, v_achievement_id, 1, now())
    ON CONFLICT (user_id, achievement_id) DO NOTHING;

    UPDATE profiles
    SET total_points = COALESCE(total_points, 0) + 50
    WHERE user_id = NEW.user_id;

    INSERT INTO achievement_notifications (user_id, achievement_id)
    VALUES (NEW.user_id, v_achievement_id)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_founding_member ON user_roles;
CREATE TRIGGER trg_check_founding_member
  AFTER INSERT ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION check_founding_member_achievement();

-- Update points for users already unlocked above
UPDATE profiles p
SET total_points = COALESCE(total_points, 0) + 50
FROM user_achievements ua
WHERE ua.user_id = p.user_id
  AND ua.achievement_id = '368a54e0-4efa-438d-98d3-1cb2772dcaaf'
  AND ua.unlocked_at IS NOT NULL;
