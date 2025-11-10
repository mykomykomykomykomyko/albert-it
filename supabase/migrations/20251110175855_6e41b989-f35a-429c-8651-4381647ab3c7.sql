-- Add enable_session_timeout column to user_preferences table
ALTER TABLE user_preferences
ADD COLUMN enable_session_timeout boolean NOT NULL DEFAULT true;