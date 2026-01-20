import React from 'react';

/**
 * Real-time clock hook for Admin dashboard
 */
export const useRealTimeClock = () => {
    const [time, setTime] = React.useState(new Date());

    React.useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    return time;
};
