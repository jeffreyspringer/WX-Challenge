import os
from supabase import create_client

# Config
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")
supabase = create_client(url, key)

def reset_month():
    # 1. Calculate the Monthly Champion (Lowest Grand Average)
    # This assumes you have a View or Table tracking monthly totals
    summary = supabase.table("monthly_leaderboard_view").select("*").order("grand_avg", vertical=True).limit(1).execute()
    
    if summary.data:
        winner = summary.data[0]
        # 2. Archive the winner into the Hall of Fame
        supabase.table("monthly_winners").insert({
            "user_id": winner['user_id'],
            "username": winner['username'],
            "score": winner['grand_avg'],
            "month_year": "Dec-2025" # You can automate this string using datetime
        }).execute()

    # 3. Wipe the active predictions/observations for the new month
    # Note: In a production app, you might just mark them as 'archived'
    supabase.table("predictions").delete().neq("id", 0).execute()
    supabase.table("actual_weather").delete().neq("id", 0).execute()
    
    print("Monthly reset complete. New month started.")

if __name__ == "__main__":
    reset_month()
