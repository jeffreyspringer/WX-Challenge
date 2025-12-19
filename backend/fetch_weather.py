import requests
import os
from supabase import create_client

# Config
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")
supabase = create_client(url, key)

STATIONS = ["KATL", "KORD", "KDFW"]

def fetch():
    headers = {"User-Agent": "(WeatherChallengeBot, your@email.com)"}
    for s in STATIONS:
        res = requests.get(f"https://api.weather.gov/stations/{s}/observations/latest", headers=headers).json()
        p = res['properties']
        
        # We use .get() and provide a default empty dictionary {} 
        # to prevent "NoneType" errors if a field is missing.
        data = {
            "station_id": s,
            "temp": p.get('temperature', {}).get('value'),
            "wind_speed": p.get('windSpeed', {}).get('value'),
            "wind_dir": p.get('windDirection', {}).get('value'),
            # This is the line that caused your crash:
            "precip": p.get('precipitationLastHour', {}).get('value') or 0
        }
        # Upsert ensures we update the same row for "Today" every 5 mins
        supabase.table("actual_weather").upsert(data, on_conflict="station_id, date").execute()

if __name__ == "__main__":
    fetch()
