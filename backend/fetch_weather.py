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
        
        data = {
            "station_id": s,
            "temp": p['temperature']['value'],
            "wind_speed": p['windSpeed']['value'],
            "wind_dir": p['windDirection']['value'],
            "precip": p['precipitationLastHour']['value'] or 0
        }
        # Upsert ensures we update the same row for "Today" every 5 mins
        supabase.table("actual_weather").upsert(data, on_conflict="station_id, date").execute()

if __name__ == "__main__":
    fetch()
