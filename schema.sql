-- TABLES
CREATE TABLE stations (id TEXT PRIMARY KEY, city_name TEXT);
INSERT INTO stations (id, city_name) VALUES ('KATL', 'Atlanta'), ('KORD', 'Chicago'), ('KDFW', 'Dallas');

CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  avatar_url TEXT,
  role TEXT DEFAULT 'user'
);

CREATE TABLE actual_weather (
  id SERIAL PRIMARY KEY,
  station_id TEXT REFERENCES stations(id),
  date DATE DEFAULT CURRENT_DATE,
  temp FLOAT,
  wind_speed FLOAT,
  wind_dir INT,
  precip FLOAT DEFAULT 0,
  UNIQUE(station_id, date)
);

CREATE TABLE predictions (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  station_id TEXT REFERENCES stations(id),
  prediction_date DATE NOT NULL,
  p_high FLOAT, p_low FLOAT, p_precip FLOAT, p_wind_speed FLOAT, p_wind_dir INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS: 8 PM EST LOCKOUT (01:00 UTC next day)
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lockout_8PM_EST" ON predictions FOR INSERT 
WITH CHECK ( (timezone('utc', now())) < (prediction_date::timestamp + interval '1 hour') );

-- TRIGGER: AUTO-PROFILE ON SIGNUP
CREATE FUNCTION handle_new_user() RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (new.id, split_part(new.email, '@', 1), 'https://api.dicebear.com/7.x/bottts/svg?seed=' || new.id);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE PROCEDURE handle_new_user();
