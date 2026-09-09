-- 1) Garantir REPLICA IDENTITY FULL para Realtime entregar payload completo
ALTER TABLE public.member_messages REPLICA IDENTITY FULL;

-- 2) Reativar a publicação Realtime para member_messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'member_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.member_messages;
  END IF;
END $$;

-- 3) Reforçar RLS: garantir que SELECT só acontece se o usuário é remetente OU destinatário
ALTER TABLE public.member_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own messages" ON public.member_messages;
DROP POLICY IF EXISTS "Users can view their messages" ON public.member_messages;
DROP POLICY IF EXISTS "member_messages_select_own" ON public.member_messages;

CREATE POLICY "member_messages_select_own"
ON public.member_messages
FOR SELECT
TO authenticated
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users can send messages" ON public.member_messages;
DROP POLICY IF EXISTS "member_messages_insert_own" ON public.member_messages;

CREATE POLICY "member_messages_insert_own"
ON public.member_messages
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = sender_id);

-- UPDATE: só destinatário pode marcar como lida (e não pode mexer em outros campos via trigger abaixo)
DROP POLICY IF EXISTS "Users can mark messages as read" ON public.member_messages;
DROP POLICY IF EXISTS "member_messages_update_receiver" ON public.member_messages;

CREATE POLICY "member_messages_update_receiver"
ON public.member_messages
FOR UPDATE
TO authenticated
USING (auth.uid() = receiver_id)
WITH CHECK (auth.uid() = receiver_id);

-- DELETE: remetente OU destinatário podem apagar (para a função "excluir conversa")
DROP POLICY IF EXISTS "Users can delete their messages" ON public.member_messages;
DROP POLICY IF EXISTS "member_messages_delete_own" ON public.member_messages;

CREATE POLICY "member_messages_delete_own"
ON public.member_messages
FOR DELETE
TO authenticated
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- 4) Trigger de blindagem: no UPDATE, só permitir alterar o campo is_read
CREATE OR REPLACE FUNCTION public.protect_member_message_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.sender_id IS DISTINCT FROM OLD.sender_id
     OR NEW.receiver_id IS DISTINCT FROM OLD.receiver_id
     OR NEW.content IS DISTINCT FROM OLD.content
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Only is_read may be updated on member_messages';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_member_message_fields_trg ON public.member_messages;
CREATE TRIGGER protect_member_message_fields_trg
BEFORE UPDATE ON public.member_messages
FOR EACH ROW
EXECUTE FUNCTION public.protect_member_message_fields();