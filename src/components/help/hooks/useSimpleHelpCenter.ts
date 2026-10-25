import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { GuideCategory, SimpleGuide } from '../types';
import { faqItems, simpleGuides } from '../data/helpGuidesData';

interface UseSimpleHelpCenterParams {
    isOpen: boolean;
    onClose: () => void;
}

export function useSimpleHelpCenter({ isOpen, onClose }: UseSimpleHelpCenterParams) {
    const [selectedGuide, setSelectedGuide] = useState<SimpleGuide | null>(null);
    const [currentStep, setCurrentStep] = useState(0);
    const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xlarge'>('normal');
    const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState<GuideCategory>('semua');
    const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const fontSizeClass = {
        normal: 'text-base',
        large: 'text-lg',
        xlarge: 'text-xl',
    }[fontSize];

    // Filter guides based on search and category
    const filteredGuides = useMemo(() => {
        let guides = simpleGuides;

        // Filter by category
        if (activeCategory !== 'semua' && activeCategory !== 'faq') {
            guides = guides.filter((g) => g.category === activeCategory);
        }

        // Filter by search
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            guides = guides.filter(
                (g) =>
                    g.title.toLowerCase().includes(query) ||
                    g.keywords.some((k) => k.toLowerCase().includes(query))
            );
        }

        return guides;
    }, [searchQuery, activeCategory]);

    // Filter FAQs based on search
    const filteredFaqs = useMemo(() => {
        if (!searchQuery.trim()) return faqItems;
        const query = searchQuery.toLowerCase();
        return faqItems.filter(
            (f) =>
                f.question.toLowerCase().includes(query) ||
                f.answer.toLowerCase().includes(query) ||
                f.keywords.some((k) => k.toLowerCase().includes(query))
        );
    }, [searchQuery]);

    const handleNextStep = useCallback(() => {
        if (selectedGuide && currentStep < selectedGuide.steps.length - 1) {
            setCurrentStep((prev) => prev + 1);
        }
    }, [selectedGuide, currentStep]);

    const handlePrevStep = useCallback(() => {
        if (currentStep > 0) {
            setCurrentStep((prev) => prev - 1);
        }
    }, [currentStep]);

    const handleSelectGuide = (guide: SimpleGuide) => {
        setSelectedGuide(guide);
        setCurrentStep(0);
    };

    const handleBack = () => {
        setSelectedGuide(null);
        setCurrentStep(0);
    };

    const increaseFontSize = () => {
        if (fontSize === 'normal') setFontSize('large');
        else if (fontSize === 'large') setFontSize('xlarge');
    };

    const decreaseFontSize = () => {
        if (fontSize === 'xlarge') setFontSize('large');
        else if (fontSize === 'large') setFontSize('normal');
    };

    // Keyboard navigation
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (enlargedImage) {
                    setEnlargedImage(null);
                } else if (selectedGuide) {
                    handleBack();
                } else {
                    onClose();
                }
            } else if (selectedGuide) {
                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    handleNextStep();
                } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                    e.preventDefault();
                    handlePrevStep();
                }
            } else if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, selectedGuide, enlargedImage, onClose, handleNextStep, handlePrevStep]);

    // Focus search on open
    useEffect(() => {
        if (isOpen && !selectedGuide) {
            const timer = setTimeout(() => searchInputRef.current?.focus(), 100);
            return () => clearTimeout(timer);
        }
    }, [isOpen, selectedGuide]);

    return {
        selectedGuide,
        currentStep,
        setCurrentStep,
        fontSize,
        fontSizeClass,
        enlargedImage,
        setEnlargedImage,
        searchQuery,
        setSearchQuery,
        activeCategory,
        setActiveCategory,
        expandedFaq,
        setExpandedFaq,
        searchInputRef,
        filteredGuides,
        filteredFaqs,
        handleNextStep,
        handlePrevStep,
        handleSelectGuide,
        handleBack,
        increaseFontSize,
        decreaseFontSize,
    };
}
