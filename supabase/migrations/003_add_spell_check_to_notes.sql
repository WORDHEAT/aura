-- Migration: Add spell_check column to notes table
-- Run this in Supabase SQL Editor

-- Add spell_check column to notes if it doesn't exist
ALTER TABLE notes ADD COLUMN IF NOT EXISTS spell_check BOOLEAN DEFAULT true;
