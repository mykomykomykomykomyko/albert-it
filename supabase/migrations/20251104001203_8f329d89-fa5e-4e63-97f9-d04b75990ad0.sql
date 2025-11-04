-- Add retention_days to conversations table for per-conversation setting
ALTER TABLE public.conversations 
ADD COLUMN retention_days INTEGER NULL;

-- Add default_retention_days to user_preferences for user-level default
ALTER TABLE public.user_preferences 
ADD COLUMN default_retention_days INTEGER NULL;

COMMENT ON COLUMN conversations.retention_days IS 'Number of days to retain this conversation before auto-deletion. NULL means use user default or never delete.';
COMMENT ON COLUMN user_preferences.default_retention_days IS 'Default number of days to retain conversations before auto-deletion. NULL means never auto-delete.';