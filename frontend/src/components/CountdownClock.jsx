import React, { useState, useEffect } from 'react';

const CountdownClock = () => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      // Target: 8 PM EST (20:00:00)
      const target = new Date();
      target.setHours(20, 0, 0, 0);

      // If it's already past 8 PM, target 8 PM tomorrow
      if (now > target) {
        target.setDate(target.getDate() + 1);
      }

      const diff = target - now;
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / 1000 / 60) % 60);
      const s = Math.floor((diff / 1000) % 60);

      setTimeLeft(`${h}h ${m}m ${s}s`);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="bg-blue-600 text-white p-4 rounded-lg text-center shadow-lg">
      <p className="text-xs uppercase tracking-widest opacity-80">Deadline to Predict</p>
      <p className="text-3xl font-mono font-bold">{timeLeft}</p>
    </div>
  );
};

export default CountdownClock;
