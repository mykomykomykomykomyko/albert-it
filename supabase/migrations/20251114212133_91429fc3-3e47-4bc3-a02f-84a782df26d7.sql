-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Admins can view all conversations" ON public.conversations;
DROP POLICY IF EXISTS "Admins can view all messages" ON public.messages;

-- Create a secure function that returns user activity stats
CREATE OR REPLACE FUNCTION public.get_user_activity_stats()
RETURNS TABLE (
  user_id uuid,
  conversation_count bigint,
  message_count bigint,
  last_active_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Only admins can call this function
  SELECT 
    p.id as user_id,
    COALESCE(c.conv_count, 0) as conversation_count,
    COALESCE(m.msg_count, 0) as message_count,
    m.last_message_at as last_active_at
  FROM profiles p
  LEFT JOIN (
    SELECT user_id, COUNT(*) as conv_count
    FROM conversations
    GROUP BY user_id
  ) c ON c.user_id = p.id
  LEFT JOIN (
    SELECT conv.user_id, COUNT(*) as msg_count, MAX(msg.created_at) as last_message_at
    FROM messages msg
    JOIN conversations conv ON conv.id = msg.conversation_id
    GROUP BY conv.user_id
  ) m ON m.user_id = p.id
  WHERE has_role(auth.uid(), 'admin');
$$;