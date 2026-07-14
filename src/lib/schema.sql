-- =============================================
-- College Pathfinder - Supabase Database Schema
-- Run this in the Supabase SQL editor
-- =============================================

-- Student profiles table
CREATE TABLE student_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  board TEXT,
  current_class TEXT,
  subjects JSONB DEFAULT '[]',
  grades JSONB DEFAULT '{}',
  test_scores JSONB DEFAULT '{}',
  target_colleges JSONB DEFAULT '[]',
  preferred_countries JSONB DEFAULT '[]',
  extracurriculars JSONB DEFAULT '[]',
  extracurricular_details TEXT DEFAULT '',
  budget_range TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users can view own profile" ON student_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON student_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON student_profiles FOR UPDATE USING (auth.uid() = user_id);

-- Saved results table
CREATE TABLE saved_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_snapshot JSONB,
  recommendations JSONB,
  paths JSONB,
  gap_analysis JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE saved_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own results" ON saved_results FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own results" ON saved_results FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own results" ON saved_results FOR DELETE USING (auth.uid() = user_id);
