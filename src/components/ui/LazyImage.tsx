import React, { useState, useEffect, useRef } from 'react';
import { ImageIcon } from 'lucide-react';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    src: string;
    alt: string;
    placeholderSrc?: string;
    fallbackSrc?: string;
    aspectRatio?: string;
    objectFit?: 'cover' | 'contain' | 'fill' | 'none';
    loadingClassName?: string;
    errorClassName?: string;
    rootMargin?: string;
    threshold?: number;
}

export const LazyImage: React.FC<LazyImageProps> = ({
    src,
    alt,
    placeholderSrc,
    fallbackSrc = '/placeholder-image.svg',
    aspectRatio,
    objectFit = 'cover',
    loadingClassName = '',
    errorClassName = '',
    rootMargin = '100px',
    threshold = 0.1,
    className = '',
    ...props
}) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [isInView, setIsInView] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [currentSrc, setCurrentSrc] = useState(placeholderSrc || '');
    const imgRef = useRef<HTMLImageElement>(null);

    // Intersection Observer for lazy loading
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsInView(true);
                    observer.disconnect();
                }
            },
            { rootMargin, threshold }
        );

        if (imgRef.current) {
            observer.observe(imgRef.current);
        }

        return () => observer.disconnect();
    }, [rootMargin, threshold]);

    // Load actual image when in view
    useEffect(() => {
        if (!isInView || !src) return;

        const img = new Image();
        img.src = src;

        img.onload = () => {
            setCurrentSrc(src);
            setIsLoaded(true);
            setHasError(false);
        };

        img.onerror = () => {
            setHasError(true);
            setCurrentSrc(fallbackSrc);
            setIsLoaded(true);
        };
    }, [isInView, src, fallbackSrc]);

    const objectFitClass = {
        cover: 'object-cover',
        contain: 'object-contain',
        fill: 'object-fill',
        none: 'object-none',
    }[objectFit];

    return (
        <div
            className={`relative overflow-hidden ${aspectRatio ? `aspect-[${aspectRatio}]` : ''}`}
            style={aspectRatio ? { aspectRatio } : undefined}
        >
            {/* Loading skeleton */}
            {!isLoaded && (
                <div className={`absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse flex items-center justify-center ${loadingClassName}`}>
                    <ImageIcon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                </div>
            )}

            {/* Actual image */}
            <img
                ref={imgRef}
                src={currentSrc || placeholderSrc}
                alt={alt}
                className={`
                    w-full h-full ${objectFitClass}
                    transition-opacity duration-300
                    ${isLoaded ? 'opacity-100' : 'opacity-0'}
                    ${hasError ? errorClassName : ''}
                    ${className}
                `}
                loading="lazy"
                {...props}
            />

            {/* Error overlay */}
            {hasError && (
                <div className={`absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 ${errorClassName}`}>
                    <div className="text-center p-4">
                        <ImageIcon className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                        <p className="text-xs text-gray-400">Gagal memuat gambar</p>
                    </div>
                </div>
            )}
        </div>
    );
};

// Avatar variant with built-in fallback
interface LazyAvatarProps {
    src?: string | null;
    alt: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    fallbackText?: string;
    className?: string;
}

const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
};

export const LazyAvatar: React.FC<LazyAvatarProps> = ({
    src,
    alt,
    size = 'md',
    fallbackText,
    className = '',
}) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);

    const initials = fallbackText
        || alt.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
        || '??';

    // Generate consistent color based on name
    const colors = [
        'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500',
        'bg-lime-500', 'bg-green-500', 'bg-emerald-500', 'bg-teal-500',
        'bg-cyan-500', 'bg-sky-500', 'bg-blue-500', 'bg-indigo-500',
        'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500',
    ];
    const colorIndex = alt.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    const bgColor = colors[colorIndex];

    if (!src || hasError) {
        return (
            <div
                className={`${sizeClasses[size]} rounded-full ${bgColor} text-white font-bold flex items-center justify-center ${className}`}
                title={alt}
            >
                {initials}
            </div>
        );
    }

    return (
        <div className={`${sizeClasses[size]} relative rounded-full overflow-hidden ${className}`}>
            {!isLoaded && (
                <div className={`absolute inset-0 rounded-full ${bgColor} text-white font-bold flex items-center justify-center`}>
                    {initials}
                </div>
            )}
            <img
                src={src}
                alt={alt}
                onLoad={() => setIsLoaded(true)}
                onError={() => setHasError(true)}
                className={`w-full h-full object-cover transition-opacity duration-200 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
                loading="lazy"
            />
        </div>
    );
};

export default LazyImage;
