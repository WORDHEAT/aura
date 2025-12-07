-- Add telegram_chat_id column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_telegram 
ON profiles(telegram_chat_id) 
WHERE telegram_chat_id IS NOT NULL;
