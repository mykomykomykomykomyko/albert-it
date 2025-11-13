-- Make user_prompt column nullable in agents table
ALTER TABLE agents 
ALTER COLUMN user_prompt DROP NOT NULL;