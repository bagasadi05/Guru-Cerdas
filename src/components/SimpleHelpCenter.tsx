import React from 'react';
import {
    useSimpleHelpCenter,
    HelpCenterHeader,
    HelpHomeView,
    HelpGuideDetailView,
    HelpLightboxModal,
    FloatingHelpButton,
} from './help';

export { FloatingHelpButton };

export interface SimpleHelpCenterProps {
    isOpen: boolean;
    onClose: () => void;
}

export const SimpleHelpCenter: React.FC<SimpleHelpCenterProps> = ({ isOpen, onClose }) => {
    const {
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
    } = useSimpleHelpCenter({ isOpen, onClose });

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className={`bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col ${fontSizeClass}`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <HelpCenterHeader
                    selectedGuide={selectedGuide}
                    currentStep={currentStep}
                    fontSize={fontSize}
                    onBack={handleBack}
                    onClose={onClose}
                    onIncreaseFontSize={increaseFontSize}
                    onDecreaseFontSize={decreaseFontSize}
                />

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {!selectedGuide ? (
                        <HelpHomeView
                            searchQuery={searchQuery}
                            onSearchChange={setSearchQuery}
                            onClearSearch={() => setSearchQuery('')}
                            searchInputRef={searchInputRef}
                            activeCategory={activeCategory}
                            onSelectCategory={setActiveCategory}
                            filteredGuides={filteredGuides}
                            filteredFaqs={filteredFaqs}
                            expandedFaq={expandedFaq}
                            onToggleFaq={(faqId) => setExpandedFaq(expandedFaq === faqId ? null : faqId)}
                            onSelectGuide={handleSelectGuide}
                            onCloseCenter={onClose}
                        />
                    ) : (
                        <HelpGuideDetailView
                            selectedGuide={selectedGuide}
                            currentStep={currentStep}
                            onSelectStep={setCurrentStep}
                            onPrevStep={handlePrevStep}
                            onNextStep={handleNextStep}
                            onBackToHome={handleBack}
                            onEnlargeImage={(img) => setEnlargedImage(img)}
                        />
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-center">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Tekan <kbd className="px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded text-xs font-bold">?</kbd> kapan saja untuk membuka bantuan • <kbd className="px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded text-xs font-bold">Esc</kbd> untuk tutup
                    </p>
                </div>
            </div>

            {/* Image Lightbox Modal */}
            <HelpLightboxModal
                imageUrl={enlargedImage}
                onClose={() => setEnlargedImage(null)}
            />
        </div>
    );
};

export default SimpleHelpCenter;

