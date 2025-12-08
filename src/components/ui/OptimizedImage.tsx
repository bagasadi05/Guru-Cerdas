import React, { useState, useEffect, useRef, ImgHTMLAttributes } from 'react';
import { useIntersectionObserver, getOptimizedImageUrl, generateBlurPlaceholder } from '../../utils/performance';

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'placeholder'> {
    src: string;
    alt: string;
    width?: number;
    height?: number;
    placeholder?: 'blur' | 'empty' | 'skeleton';
    quality?: number;
    priority?: boolean;
}

/**
 * Optimized Image Component
 * Features:
 * - Lazy loading with intersection observer
 * - Blur placeholder while loading
 * - Automatic URL optimization for Supabase storage
 * - Error handling with fallback
 */
export const OptimizedImage: React.FC<OptimizedImageProps> = ({
    src,
    alt,
    width,
    height,
    placeholder = 'blur',
    quality = 80,
    priority = false,
    className = '',
    onLoad,
    onError,
    ...props
}) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [ref, isVisible] = useIntersectionObserver({ rootMargin: '200px' });
    const imgRef = useRef<HTMLImageElement>(null);

    // Get optimized URL
    const optimizedSrc = getOptimizedImageUrl(src, { width, height, quality });

    // Generate placeholder
    const placeholderSrc = placeholder === 'blur'
        ? generateBlurPlaceholder(width || 100, height || 100)
        : undefined;

    // Load image when visible or priority
    const shouldLoad = priority || isVisible;

    useEffect(() => {
        if (shouldLoad && imgRef.current) {
            imgRef.current.src = optimizedSrc;
        }
    }, [shouldLoad, optimizedSrc]);

    const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
        setIsLoaded(true);
        onLoad?.(e);
    };

    const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
        setHasError(true);
        onError?.(e);
    };

    // Fallback for error
    if (hasError) {
        return (
            <div
                className={`bg-slate-200 dark:bg-slate-700 flex items-center justify-center ${className}`}
                style={{ width, height }}
            >
                <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            </div>
        );
    }

    return (
        <div ref={ref} className="relative overflow-hidden" style={{ width, height }}>
            {/* Placeholder */}
            {placeholder === 'skeleton' && !isLoaded && (
                <div
                    className={`absolute inset-0 bg-slate-200 dark:bg-slate-700 animate-pulse ${className}`}
                />
            )}

            {placeholder === 'blur' && !isLoaded && placeholderSrc && (
                <img
                    src={placeholderSrc}
                    alt=""
                    className={`absolute inset-0 w-full h-full object-cover blur-sm scale-110 ${className}`}
                    aria-hidden="true"
                />
            )}

            {/* Actual image */}
            {shouldLoad && (
                <img
                    ref={imgRef}
                    alt={alt}
                    width={width}
                    height={height}
                    className={`
                        ${className}
                        transition-opacity duration-300
                        ${isLoaded ? 'opacity-100' : 'opacity-0'}
                    `}
                    onLoad={handleLoad}
                    onError={handleError}
                    loading={priority ? 'eager' : 'lazy'}
                    decoding="async"
                    {...props}
                />
            )}
        </div>
    );
};

/**
 * Avatar component with optimization
 */
interface AvatarProps {
    src?: string | null;
    alt: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    fallback?: string;
    className?: string;
}

const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg'
};

const sizePx = {
    sm: 32,
    md: 40,
    lg: 48,
    xl: 64
};

export const OptimizedAvatar: React.FC<AvatarProps> = ({
    src,
    alt,
    size = 'md',
    fallback,
    className = ''
}) => {
    const [hasError, setHasError] = useState(false);
    const initials = fallback || alt.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

    if (!src || hasError) {
        return (
            <div
                className={`
                    ${sizeClasses[size]} 
                    rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 
                    flex items-center justify-center text-white font-medium
                    ${className}
                `}
            >
                {initials}
            </div>
        );
    }

    return (
        <OptimizedImage
            src={src}
            alt={alt}
            width={sizePx[size]}
            height={sizePx[size]}
            className={`${sizeClasses[size]} rounded-full object-cover ${className}`}
            placeholder="skeleton"
            onError={() => setHasError(true)}
        />
    );
};

/**
 * Background image component with lazy loading
 */
interface BackgroundImageProps {
    src: string;
    children?: React.ReactNode;
    className?: string;
    overlay?: boolean;
}

export const LazyBackgroundImage: React.FC<BackgroundImageProps> = ({
    src,
    children,
    className = '',
    overlay = false
}) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [ref, isVisible] = useIntersectionObserver({ rootMargin: '100px' });

    useEffect(() => {
        if (isVisible && !isLoaded) {
            const img = new Image();
            img.onload = () => setIsLoaded(true);
            img.src = src;
        }
    }, [isVisible, src, isLoaded]);

    return (
        <div
            ref={ref}
            className={`relative ${className}`}
            style={{
                backgroundImage: isLoaded ? `url(${src})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
            }}
        >
            {!isLoaded && (
                <div className="absolute inset-0 bg-slate-200 dark:bg-slate-700 animate-pulse" />
            )}
            {overlay && (
                <div className="absolute inset-0 bg-black/40" />
            )}
            {children}
        </div>
    );
};

export default OptimizedImage;
