import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const STATIONS = ['KATL', 'KORD', 'KDFW'];

export default function CurrentWeather() {
  const [weather, setWeather] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWeather();
    const interval = setInterval(fetchWeather, 300000); // Refresh every 5m
    return () => clearInterval(interval);
  }, []);

  const fetchWeather = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data } = await supabase
        .from('actual_weather')
        .select('*')
        .eq('date', today);

      if (data) {
        const map = {};
        data.forEach(w => map[w.station_id] = w);
        setWeather(map);
      }
    } catch (error) {
      console.error('Weather error:', error);
    } finally {
      setLoading(false);
    }
  };

  // 🌡️ CONVERSION HELPER: Celsius -> Fahrenheit (1 Decimal)
  const toFahrenheit = (celsius) => {
    if (celsius === null || celsius === undefined) return '--';
    const f = (celsius * 9/5) + 32;
    return f.toFixed(1); // Keeps 1 decimal place (e.g., 72.4)
  };

  // 💨 WIND HELPER: Force 1 Decimal
  const formatWind = (val) => {
    if (val === null || val === undefined) return '--';
    return Number(val).toFixed(1);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl h-full flex flex-col">
      <div className="bg-slate-950 p-4 border-b border-slate-800 flex justify-between items-center">
        <h2 className="text-white font-bold text-lg">
