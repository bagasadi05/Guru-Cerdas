import React from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PortalNavigation } from '../../src/components/pages/portal/PortalNavigation';
import { Tabs, TabsContent } from '../../src/components/ui/Tabs';
import type { PortalPrimaryTab } from '../../src/components/pages/portal/types';

const PortalNavigationHarness: React.FC<{
    initialTab?: PortalPrimaryTab;
    unreadMessagesCount?: number;
    attentionCount?: number;
}> = ({ initialTab = 'beranda', unreadMessagesCount = 0, attentionCount = 0 }) => {
    const [activeTab, setActiveTab] = React.useState<PortalPrimaryTab>(initialTab);

    return (
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as PortalPrimaryTab)}>
            <PortalNavigation
                activeTab={activeTab}
                unreadMessagesCount={unreadMessagesCount}
                attentionCount={attentionCount}
            />
            <TabsContent value="beranda"><div>Konten Beranda</div></TabsContent>
            <TabsContent value="perkembangan"><div>Konten Perkembangan</div></TabsContent>
            <TabsContent value="kehadiran"><div>Konten Kehadiran</div></TabsContent>
            <TabsContent value="komunikasi"><div>Konten Komunikasi</div></TabsContent>
            <TabsContent value="lainnya"><div>Konten Lainnya</div></TabsContent>
        </Tabs>
    );
};

describe('PortalNavigation', () => {
    it('shows badges for attention and unread messages', () => {
        render(<PortalNavigationHarness unreadMessagesCount={3} attentionCount={2} />);

        const [berandaTab, , , komunikasiTab] = screen.getAllByRole('tab');

        expect(berandaTab).toHaveTextContent('2');
        expect(komunikasiTab).toHaveTextContent('3');
    });

    it('switches tab content when a portal tab is clicked', () => {
        render(<PortalNavigationHarness />);

        expect(screen.getByText('Konten Beranda')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('tab', { name: /Komunikasi/i }));

        expect(screen.getByText('Konten Komunikasi')).toBeInTheDocument();
        expect(screen.queryByText('Konten Beranda')).not.toBeInTheDocument();
    });
});
