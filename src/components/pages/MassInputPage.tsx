import React from 'react';
import { useMassInputViewModel } from './mass-input/hooks/useMassInputViewModel';
import { MassInputPageView } from './mass-input/MassInputPageView';

const MassInputPage: React.FC = () => {
    const viewProps = useMassInputViewModel();
    return <MassInputPageView {...viewProps} />;
};

export default MassInputPage;
