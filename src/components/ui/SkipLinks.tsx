/**
 * SkipLinks Component
 * 
 * Provides skip links for keyboard users to bypass repetitive navigation
 * and jump directly to main content, navigation, or other landmarks.
 */

import React from 'react';

interface SkipLinkItem {
    id: string;
    label: string;
}

interface SkipLinksProps {
    links?: SkipLinkItem[];
}

const defaultLinks: SkipLinkItem[] = [
    { id: 'main-content', label: 'Lewati ke konten utama' },
    { id: 'main-navigation', label: 'Lewati ke navigasi' },
];

const SkipLinks: React.FC<SkipLinksProps> = ({ links = defaultLinks }) => {
    const handleSkip = (e: React.MouseEvent | React.KeyboardEvent, targetId: string) => {
        e.preventDefault();
        const target = document.getElementById(targetId);
        if (target) {
            // Make element focusable if it isn't
            if (!target.hasAttribute('tabindex')) {
                target.setAttribute('tabindex', '-1');
            }
            target.focus();
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    return (
        <nav
            className="skip-links-container"
            aria-label="Skip links"
        >
            {links.map((link) => (
                <a
                    key={link.id}
                    href={`#${link.id}`}
                    onClick={(e) => handleSkip(e, link.id)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            handleSkip(e, link.id);
                        }
                    }}
                    className="skip-link"
                >
                    {link.label}
                </a>
            ))}

            <style>{`
                .skip-links-container {
                    position: fixed;
                    top: 0;
                    left: 0;
                    z-index: 10000;
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                    padding: 8px;
                }

                .skip-link {
                    position: absolute;
                    top: -100px;
                    left: 8px;
                    padding: 12px 24px;
                    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
                    color: white;
                    font-weight: 600;
                    font-size: 14px;
                    border-radius: 8px;
                    text-decoration: none;
                    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
                    transition: top 0.2s ease-out, transform 0.2s ease-out;
                    outline: none;
                }

                .skip-link:focus {
                    top: 8px;
                    transform: translateY(0);
                    outline: 3px solid white;
                    outline-offset: 2px;
                }

                .skip-link:focus:nth-child(2) {
                    top: 60px;
                }

                .skip-link:focus:nth-child(3) {
                    top: 112px;
                }

                .skip-link:hover {
                    transform: scale(1.02);
                }

                /* Respect reduced motion preference */
                @media (prefers-reduced-motion: reduce) {
                    .skip-link {
                        transition: none;
                    }
                }
            `}</style>
        </nav>
    );
};

export default SkipLinks;
