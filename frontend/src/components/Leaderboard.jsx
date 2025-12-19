import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

// SCORING MATH HELPER
const calculateScore = (prediction, actual) => {
  if (!prediction || !actual) return 0;
  
  let score = 0;
  
  // 1. Temp: 1 point per degree error
  // We use "p_high" vs actual "temp" (assuming high for the day)
  score += Math.abs(prediction.p_high - actual.temp); 
  
  // 2. Wind Speed: 1 point per mph error
  score += Math.abs(prediction.p_wind_speed - actual.wind_speed);

  // 3. Wind Dir: Circular math (350° vs 10° is 20° diff, not 340°)
  const windDiff = Math.abs(prediction.p_wind_dir - actual.wind_dir) % 360;
  const circularDiff = windDiff > 180 ? 360 - windDiff : windDiff;
  score += circularDiff;

  // 4. Precip: 1 point per 0.01" error (multiply by 100)
  score += Math.abs(prediction.p_precip - actual.precip) * 100;

  return Math.round(score);
};

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  // THE MAIN DATA FETCHING FUNCTION
  const fetchData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      // A. Get Live Weather for Today
      const { data: weatherData } = await supabase
        .from('actual_weather')
        .select('*')
        .eq('date', today);
      
      // Convert array to a Map for easy lookup: { 'KATL': {temp: 70...}, 'KORD': {...} }
      const weatherMap = {};
      if (weatherData) {
        weatherData.forEach(w => weatherMap[w.station_id] = w);
      }

      // B. Get Predictions for Today
      const { data: preds } = await supabase
        .from('predictions')
        .select('*')
        .eq('prediction_date', today);

      if (!preds || preds.length === 0) {
        setLeaderboard([]);
        setLoading(false);
        return;
      }

      // C. Get Profiles (to show names instead of IDs)
      // We extract all unique user_ids from the predictions first
      const userIds = [...new Set(preds.map(p => p.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);

      // Create a Profile Map: { 'user-uuid-123': {username: 'Jeff', avatar: '...'} }
      const profileMap = {};
      if (profiles) {
        profiles.forEach(p => profileMap
