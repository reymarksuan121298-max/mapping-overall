-- Create the franchise_locations table
CREATE TABLE public.franchise_locations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    heading DOUBLE PRECISION DEFAULT 0,
    speed DOUBLE PRECISION DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable Row Level Security
ALTER TABLE public.franchise_locations ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations
CREATE POLICY "Enable all operations for franchise_locations" 
ON public.franchise_locations
FOR ALL 
USING (true) 
WITH CHECK (true);
