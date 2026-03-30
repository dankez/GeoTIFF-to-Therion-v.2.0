import React, { useEffect, useMemo } from 'react';
import { useTranslation } from '../LanguageContext';

interface ImageModalProps {
    blob: Blob | null;
    onClose: () => void;
}

export const ImageModal: React.FC<ImageModalProps> = ({ blob, onClose }) => {
    const { t } = useTranslation();
    const imageUrl = useMemo(() => blob ? URL.createObjectURL(blob) : null, [blob]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);

        // Cleanup function
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            if (imageUrl) {
                URL.revokeObjectURL(imageUrl);
            }
        };
    }, [onClose, imageUrl]);

    if (!imageUrl) return null;

    return (
        <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="image-modal-title"
        >
            <div 
                className="relative max-w-full max-h-full flex flex-col items-center"
                onClick={(e) => e.stopPropagation()}
            >
                <h3 id="image-modal-title" className="sr-only">{t('imageModal_title')}</h3>
                <img src={imageUrl} alt={t('imageModal_title')} className="block max-w-[95vw] max-h-[90vh] object-contain rounded-lg shadow-2xl" />
                <button 
                    onClick={onClose}
                    className="absolute -top-3 -right-3 bg-white rounded-full p-2 text-gray-800 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-white transition-transform transform hover:scale-110"
                    aria-label={t('imageModal_close')}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
    );
};