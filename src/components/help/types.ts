import React from 'react';

export type GuideCategory = 'semua' | 'dasar' | 'lanjutan' | 'faq';

export interface SimpleGuideStep {
    title: string;
    description: string;
    tip?: string;
    image?: string;
}

export interface SimpleGuide {
    id: string;
    title: string;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
    category: GuideCategory;
    keywords: string[];
    steps: SimpleGuideStep[];
}

export interface FAQItem {
    id: string;
    question: string;
    answer: string;
    keywords: string[];
}

export interface CategoryTab {
    id: GuideCategory;
    label: string;
    icon: React.ReactNode;
}
