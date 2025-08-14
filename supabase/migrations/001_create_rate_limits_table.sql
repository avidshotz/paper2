-- Create user_rate_limits table for tracking user usage and rate limiting
CREATE TABLE IF NOT EXISTS user_rate_limits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    email TEXT,
    is_authenticated BOOLEAN DEFAULT FALSE,
    is_paying_user BOOLEAN DEFAULT FALSE,
    monthly_generations INTEGER DEFAULT 0,
    last_generation_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_rate_limits_user_id ON user_rate_limits(user_id);
CREATE INDEX IF NOT EXISTS idx_user_rate_limits_email ON user_rate_limits(email);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_user_rate_limits_updated_at 
    BEFORE UPDATE ON user_rate_limits 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE user_rate_limits ENABLE ROW LEVEL SECURITY;

-- Create policy for service role to access all records
CREATE POLICY "Service role can access all user_rate_limits" ON user_rate_limits
    FOR ALL USING (auth.role() = 'service_role');

-- Create policy for authenticated users to view their own data
CREATE POLICY "Users can view their own rate limit data" ON user_rate_limits
    FOR SELECT USING (auth.uid()::text = user_id);

-- Create policy for authenticated users to update their own data
CREATE POLICY "Users can update their own rate limit data" ON user_rate_limits
    FOR UPDATE USING (auth.uid()::text = user_id);
