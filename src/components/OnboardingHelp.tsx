import React, { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react';
import { X, ChevronRight, ChevronLeft, Check, Play, Pause, Volume2, VolumeX, Maximize, HelpCircle, Search, Book, Video, ExternalLink, Lightbulb } from 'lucide-react';

/**
 * Onboarding & Help System
 * Features: Product tour, contextual tooltips, help center, video tutorials
 */

// ============================================
// TYPES
// ============================================

export interface TourStep {
    id: string;
    target: string; // CSS selector
    title: string;
    content: string;
    position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
    action?: {
        label: string;
        onClick: () => void;
    };
    onEnter?: () => void;
    onExit?: () => void;
}

export interface HelpArticle {
    id: string;
    title: string;
    content: string;
    category: string;
    tags: string[];
    videoUrl?: string;
}

// ============================================
// PRODUCT TOUR
// ============================================

interface TourContextValue {
    isActive: boolean;
    currentStep: number;
    steps: TourStep[];
    start: (steps: TourStep[]) => void;
    next: () => void;
    prev: () => void;
    skip: () => void;
    complete: () => void;
    goTo: (step: number) => void;
}

const TourContext = createContext<TourContextValue | null>(null);

export const useTour = () => {
    const context = useContext(TourContext);
    if (!context) {
        throw new Error('useTour must be used within TourProvider');
    }
    return context;
};

export const TourProvider: React.FC<{
    children: React.ReactNode;
    onComplete?: () => void;
    storageKey?: string;
}> = ({
    children,
    onComplete,
    storageKey = 'portal_guru_tour_completed'
}) => {
        const [isActive, setIsActive] = useState(false);
        const [currentStep, setCurrentStep] = useState(0);
        const [steps, setSteps] = useState<TourStep[]>([]);

        const start = useCallback((tourSteps: TourStep[]) => {
            // Check if already completed
            if (localStorage.getItem(storageKey)) {
                return;
            }
            setSteps(tourSteps);
            setCurrentStep(0);
            setIsActive(true);
            tourSteps[0]?.onEnter?.();
        }, [storageKey]);

        const next = useCallback(() => {
            if (currentStep < steps.length - 1) {
                steps[currentStep]?.onExit?.();
                setCurrentStep(prev => prev + 1);
                steps[currentStep + 1]?.onEnter?.();
            } else {
                complete();
            }
        }, [currentStep, steps]);

        const prev = useCallback(() => {
            if (currentStep > 0) {
                steps[currentStep]?.onExit?.();
                setCurrentStep(prev => prev - 1);
                steps[currentStep - 1]?.onEnter?.();
            }
        }, [currentStep, steps]);

        const skip = useCallback(() => {
            steps[currentStep]?.onExit?.();
            setIsActive(false);
            localStorage.setItem(storageKey, 'true');
        }, [currentStep, steps, storageKey]);

        const complete = useCallback(() => {
            steps[currentStep]?.onExit?.();
            setIsActive(false);
            localStorage.setItem(storageKey, 'true');
            onComplete?.();
        }, [currentStep, steps, onComplete, storageKey]);

        const goTo = useCallback((step: number) => {
            if (step >= 0 && step < steps.length) {
                steps[currentStep]?.onExit?.();
                setCurrentStep(step);
                steps[step]?.onEnter?.();
            }
        }, [currentStep, steps]);

        return (
            <TourContext.Provider value={{ isActive, currentStep, steps, start, next, prev, skip, complete, goTo }}>
                {children}
                {isActive && <TourOverlay />}
            </TourContext.Provider>
        );
    };

// Tour Overlay Component
const TourOverlay: React.FC = () => {
    const { currentStep, steps, next, prev, skip, complete } = useTour();
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
    const step = steps[currentStep];

    useEffect(() => {
        if (!step) return;

        const findTarget = () => {
            const target = document.querySelector(step.target);
            if (target) {
                const rect = target.getBoundingClientRect();
                setTargetRect(rect);

                // Scroll into view
                target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
                setTargetRect(null);
            }
        };

        findTarget();
        // Re-check on resize
        window.addEventListener('resize', findTarget);
        return () => window.removeEventListener('resize', findTarget);
    }, [step]);

    if (!step) return null;

    const isLastStep = currentStep === steps.length - 1;
    const isFirstStep = currentStep === 0;

    // Calculate popup position
    const getPopupStyle = (): React.CSSProperties => {
        if (!targetRect || step.position === 'center') {
            return {
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)'
            };
        }

        const padding = 16;
        const offset = 12;

        switch (step.position || 'bottom') {
            case 'top':
                return {
                    bottom: window.innerHeight - targetRect.top + offset,
                    left: targetRect.left + targetRect.width / 2,
                    transform: 'translateX(-50%)'
                };
            case 'bottom':
                return {
                    top: targetRect.bottom + offset,
                    left: targetRect.left + targetRect.width / 2,
                    transform: 'translateX(-50%)'
                };
            case 'left':
                return {
                    top: targetRect.top + targetRect.height / 2,
                    right: window.innerWidth - targetRect.left + offset,
                    transform: 'translateY(-50%)'
                };
            case 'right':
                return {
                    top: targetRect.top + targetRect.height / 2,
                    left: targetRect.right + offset,
                    transform: 'translateY(-50%)'
                };
            default:
                return {};
        }
    };

    return (
        <div className="fixed inset-0 z-[100]">
            {/* Backdrop with hole */}
            <svg className="absolute inset-0 w-full h-full">
                <defs>
                    <mask id="tour-mask">
                        <rect x="0" y="0" width="100%" height="100%" fill="white" />
                        {targetRect && (
                            <rect
                                x={targetRect.left - 8}
                                y={targetRect.top - 8}
                                width={targetRect.width + 16}
                                height={targetRect.height + 16}
                                rx="12"
                                fill="black"
                            />
                        )}
                    </mask>
                </defs>
                <rect
                    x="0" y="0"
                    width="100%" height="100%"
                    fill="rgba(0,0,0,0.7)"
                    mask="url(#tour-mask)"
                />
            </svg>

            {/* Target highlight */}
            {targetRect && (
                <div
                    className="absolute border-2 border-indigo-500 rounded-xl animate-pulse pointer-events-none"
                    style={{
                        left: targetRect.left - 8,
                        top: targetRect.top - 8,
                        width: targetRect.width + 16,
                        height: targetRect.height + 16
                    }}
                />
            )}

            {/* Tooltip popup */}
            <div
                className="absolute w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-5 animate-scale-in"
                style={getPopupStyle()}
            >
                {/* Progress */}
                <div className="flex items-center gap-1 mb-3">
                    {steps.map((_, i) => (
                        <div
                            key={i}
                            className={`h-1 flex-1 rounded-full transition-colors ${i <= currentStep ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-700'
                                }`}
                        />
                    ))}
                </div>

                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                    {step.title}
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                    {step.content}
                </p>

                {step.action && (
                    <button
                        onClick={step.action.onClick}
                        className="w-full mb-3 px-4 py-2 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-xl font-medium hover:bg-indigo-200 dark:hover:bg-indigo-900/60 transition-colors"
                    >
                        {step.action.label}
                    </button>
                )}

                <div className="flex items-center justify-between">
                    <button
                        onClick={skip}
                        className="text-sm text-slate-500 hover:text-slate-700"
                    >
                        Lewati
                    </button>
                    <div className="flex items-center gap-2">
                        {!isFirstStep && (
                            <button
                                onClick={prev}
                                className="p-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                        )}
                        <button
                            onClick={isLastStep ? complete : next}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-medium"
                        >
                            {isLastStep ? 'Selesai' : 'Lanjut'}
                            {isLastStep ? <Check className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ============================================
// CONTEXTUAL TOOLTIP
// ============================================

interface TooltipProps {
    content: string | React.ReactNode;
    children: React.ReactElement;
    position?: 'top' | 'bottom' | 'left' | 'right';
    delay?: number;
    showIcon?: boolean;
}

export const Tooltip: React.FC<TooltipProps> = ({
    content,
    children,
    position = 'top',
    delay = 200,
    showIcon = false
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout>();
    const triggerRef = useRef<HTMLDivElement>(null);

    const handleMouseEnter = () => {
        timeoutRef.current = setTimeout(() => setIsVisible(true), delay);
    };

    const handleMouseLeave = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsVisible(false);
    };

    const positionClasses = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 -translate-y-1/2 mr-2',
        right: 'left-full top-1/2 -translate-y-1/2 ml-2'
    };

    const arrowClasses = {
        top: 'top-full left-1/2 -translate-x-1/2 border-t-slate-900 dark:border-t-slate-100 border-x-transparent border-b-transparent',
        bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-slate-900 dark:border-b-slate-100 border-x-transparent border-t-transparent',
        left: 'left-full top-1/2 -translate-y-1/2 border-l-slate-900 dark:border-l-slate-100 border-y-transparent border-r-transparent',
        right: 'right-full top-1/2 -translate-y-1/2 border-r-slate-900 dark:border-r-slate-100 border-y-transparent border-l-transparent'
    };

    return (
        <div
            ref={triggerRef}
            className="relative inline-flex items-center"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {children}
            {showIcon && (
                <HelpCircle className="w-3.5 h-3.5 ml-1 text-slate-400" />
            )}
            {isVisible && (
                <div
                    className={`absolute z-50 ${positionClasses[position]}`}
                    role="tooltip"
                >
                    <div className="relative px-3 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm rounded-lg shadow-lg whitespace-nowrap max-w-xs">
                        {content}
                        <div className={`absolute w-0 h-0 border-4 ${arrowClasses[position]}`} />
                    </div>
                </div>
            )}
        </div>
    );
};

// ============================================
// HELP CENTER
// ============================================

interface HelpCenterProps {
    isOpen: boolean;
    onClose: () => void;
    articles: HelpArticle[];
    onArticleClick?: (article: HelpArticle) => void;
}

export const HelpCenter: React.FC<HelpCenterProps> = ({
    isOpen,
    onClose,
    articles,
    onArticleClick
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(null);

    const categories = [...new Set(articles.map(a => a.category))];

    const filteredArticles = articles.filter(article => {
        const matchesSearch = !searchQuery ||
            article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            article.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesCategory = !selectedCategory || article.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />

            <div className="relative w-full max-w-3xl max-h-[80vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-scale-in">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
                            <Book className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                                {selectedArticle ? selectedArticle.title : 'Pusat Bantuan'}
                            </h2>
                            {selectedArticle && (
                                <button
                                    onClick={() => setSelectedArticle(null)}
                                    className="text-sm text-indigo-600"
                                >
                                    ← Kembali
                                </button>
                            )}
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {selectedArticle ? (
                    /* Article View */
                    <div className="flex-1 overflow-y-auto p-6">
                        {selectedArticle.videoUrl && (
                            <VideoPlayer url={selectedArticle.videoUrl} className="mb-6" />
                        )}
                        <div className="prose dark:prose-invert max-w-none">
                            <div dangerouslySetInnerHTML={{ __html: selectedArticle.content }} />
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Search */}
                        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Cari artikel bantuan..."
                                    className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>

                        {/* Categories */}
                        <div className="flex items-center gap-2 p-4 overflow-x-auto border-b border-slate-200 dark:border-slate-800">
                            <button
                                onClick={() => setSelectedCategory(null)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${!selectedCategory
                                    ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600'
                                    : 'text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    }`}
                            >
                                Semua
                            </button>
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${selectedCategory === cat
                                        ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600'
                                        : 'text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                                        }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>

                        {/* Articles List */}
                        <div className="flex-1 overflow-y-auto p-4">
                            <div className="grid gap-3">
                                {filteredArticles.map(article => (
                                    <button
                                        key={article.id}
                                        onClick={() => {
                                            setSelectedArticle(article);
                                            onArticleClick?.(article);
                                        }}
                                        className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-left transition-colors"
                                    >
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${article.videoUrl
                                            ? 'bg-red-100 dark:bg-red-900/40 text-red-600'
                                            : 'bg-blue-100 dark:bg-blue-900/40 text-blue-600'
                                            }`}>
                                            {article.videoUrl ? <Video className="w-5 h-5" /> : <Book className="w-5 h-5" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-medium text-slate-900 dark:text-white">
                                                {article.title}
                                            </h3>
                                            <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">
                                                {article.content.replace(/<[^>]*>/g, '').substring(0, 100)}...
                                            </p>
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className="text-xs text-indigo-600 bg-indigo-50 dark:bg-indigo-900/40 px-2 py-0.5 rounded">
                                                    {article.category}
                                                </span>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-slate-400" />
                                    </button>
                                ))}

                                {filteredArticles.length === 0 && (
                                    <div className="text-center py-8 text-slate-500">
                                        Tidak ada artikel ditemukan
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

// ============================================
// VIDEO PLAYER
// ============================================

interface VideoPlayerProps {
    url: string;
    className?: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ url, className = '' }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);

    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const toggleMute = () => {
        if (videoRef.current) {
            videoRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            setProgress((videoRef.current.currentTime / videoRef.current.duration) * 100);
        }
    };

    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration);
        }
    };

    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
        if (videoRef.current) {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const percentage = x / rect.width;
            videoRef.current.currentTime = percentage * videoRef.current.duration;
        }
    };

    const toggleFullscreen = () => {
        if (videoRef.current) {
            if (document.fullscreenElement) {
                document.exitFullscreen();
            } else {
                videoRef.current.requestFullscreen();
            }
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className={`relative rounded-xl overflow-hidden bg-black group ${className}`}>
            <video
                ref={videoRef}
                src={url}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
                className="w-full aspect-video"
            />

            {/* Controls overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                {/* Center play button */}
                {!isPlaying && (
                    <button
                        onClick={togglePlay}
                        className="absolute inset-0 flex items-center justify-center"
                    >
                        <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                            <Play className="w-8 h-8 text-white ml-1" />
                        </div>
                    </button>
                )}

                {/* Bottom controls */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                    {/* Progress bar */}
                    <div
                        className="h-1 bg-white/30 rounded-full mb-3 cursor-pointer"
                        onClick={handleSeek}
                    >
                        <div
                            className="h-full bg-indigo-500 rounded-full"
                            style={{ width: `${progress}%` }}
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button onClick={togglePlay} className="text-white">
                                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                            </button>
                            <button onClick={toggleMute} className="text-white">
                                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                            </button>
                            <span className="text-sm text-white/80">
                                {formatTime(videoRef.current?.currentTime || 0)} / {formatTime(duration)}
                            </span>
                        </div>
                        <button onClick={toggleFullscreen} className="text-white">
                            <Maximize className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ============================================
// FEATURE TIP
// ============================================

interface FeatureTipProps {
    id: string;
    title: string;
    description: string;
    position?: 'top' | 'bottom' | 'left' | 'right';
    children: React.ReactNode;
}

export const FeatureTip: React.FC<FeatureTipProps> = ({
    id,
    title,
    description,
    position = 'bottom',
    children
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const storageKey = `feature_tip_${id}`;

    useEffect(() => {
        const dismissed = localStorage.getItem(storageKey);
        if (!dismissed) {
            setTimeout(() => setIsVisible(true), 1000);
        }
    }, [storageKey]);

    const dismiss = () => {
        setIsVisible(false);
        localStorage.setItem(storageKey, 'true');
    };

    const positionClasses = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 -translate-y-1/2 mr-2',
        right: 'left-full top-1/2 -translate-y-1/2 ml-2'
    };

    return (
        <div className="relative inline-block">
            {children}
            {isVisible && (
                <div className={`absolute z-50 ${positionClasses[position]} animate-scale-in`}>
                    <div className="w-64 p-4 bg-indigo-600 text-white rounded-xl shadow-lg">
                        <div className="flex items-start gap-2 mb-2">
                            <Lightbulb className="w-5 h-5 flex-shrink-0" />
                            <h4 className="font-medium">{title}</h4>
                        </div>
                        <p className="text-sm text-indigo-100 mb-3">{description}</p>
                        <button
                            onClick={dismiss}
                            className="text-sm font-medium text-indigo-200 hover:text-white"
                        >
                            Mengerti
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// ============================================
// HELP BUTTON
// ============================================

export const HelpButton: React.FC<{
    onClick: () => void;
    className?: string;
}> = ({ onClick, className = '' }) => {
    return (
        <button
            onClick={onClick}
            className={`fixed bottom-24 lg:bottom-4 right-4 w-12 h-12 bg-indigo-500 hover:bg-indigo-600 text-white rounded-full shadow-lg flex items-center justify-center z-40 transition-all hover:scale-105 ${className}`}
            aria-label="Bantuan"
        >
            <HelpCircle className="w-6 h-6" />
        </button>
    );
};

// ============================================
// EXPORTS
// ============================================

export default {
    TourProvider,
    useTour,
    Tooltip,
    HelpCenter,
    VideoPlayer,
    FeatureTip,
    HelpButton
};
