import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * PhSchedulePage has been consolidated into SchedulePage under the "ph" tab.
 * This component redirects to /jadwal?tab=ph for backward compatibility.
 */
const PhSchedulePage: React.FC = () => {
    return <Navigate to="/jadwal?tab=ph" replace />;
};

export default PhSchedulePage;
