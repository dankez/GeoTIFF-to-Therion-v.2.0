import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ParsedInfo } from '../types';
import { useTranslation } from '../LanguageContext';
import { HillshadeCanvas } from './HillshadeCanvas';

interface CropModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConvert: (cropRect: { x: number; y: number; width: number; height: number; }) => void;
    info: ParsedInfo;
}

const InfoItem: React.FC<{ label: string; value: string | React.ReactNode }> = ({ label, value }) => (
    <div className="flex justify-between text-xs sm:text-sm">
        <span className="text-gray-400">{label}:</span>
        <span className="font-mono text-gray-200 text-right">{value}</span>
    </div>
);


export const CropModal: React.FC<CropModalProps> = ({ isOpen, onClose, onConvert, info }) => {
    const { t } = useTranslation();
    const [crop, setCrop] = useState({ x: 0, y: 0, width: info.width, height: info.height });
    const [isDragging, setIsDragging] = useState<string | null>(null);
    const imageContainerRef = useRef<HTMLDivElement>(null);
    const startPos = useRef({ x: 0, y: 0, cropX: 0, cropY: 0, cropW: 0, cropH: 0 });

    useEffect(() => {
        setCrop({ x: 0, y: 0, width: info.width, height: info.height });
    }, [info]);

    const handleMouseDown = (e: React.MouseEvent, handle: string) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(handle);
        startPos.current = { x: e.clientX, y: e.clientY, cropX: crop.x, cropY: crop.y, cropW: crop.width, cropH: crop.height };
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging || !imageContainerRef.current) return;
            e.preventDefault();
            e.stopPropagation();

            const rect = imageContainerRef.current.getBoundingClientRect();
            const scaleX = info.width / rect.width;
            const scaleY = info.height / rect.height;

            const dx = (e.clientX - startPos.current.x) * scaleX;
            const dy = (e.clientY - startPos.current.y) * scaleY;

            let { cropX, cropY, cropW, cropH } = startPos.current;

            if (isDragging.includes('left')) {
                const newWidth = Math.max(10, cropW - dx);
                const newX = Math.min(cropX + cropW - 10, cropX + dx);
                if (newX >= 0) {
                    cropX = newX;
                    cropW = newWidth;
                }
            }
            if (isDragging.includes('right')) {
                cropW = Math.max(10, cropW + dx);
            }
            if (isDragging.includes('top')) {
                const newHeight = Math.max(10, cropH - dy);
                const newY = Math.min(cropY + cropH - 10, cropY + dy);
                 if (newY >= 0) {
                    cropY = newY;
                    cropH = newHeight;
                }
            }
            if (isDragging.includes('bottom')) {
                cropH = Math.max(10, cropH + dy);
            }

            // Boundary checks
            cropX = Math.max(0, Math.round(cropX));
            cropY = Math.max(0, Math.round(cropY));
            cropW = Math.min(info.width - cropX, Math.round(cropW));
            cropH = Math.min(info.height - cropY, Math.round(cropH));

            setCrop({ x: cropX, y: cropY, width: cropW, height: cropH });
        };
        
        const handleMouseUp = () => setIsDragging(null);

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, info.width, info.height]);
    
    const cropInfo = useMemo(() => {
        const { pixelSizeX, pixelSizeY, originX, originY, height: originalHeight } = info;
        
        const originalULCornerY = originY - (originalHeight * pixelSizeY);

        const newULCornerX = originX + (crop.x * pixelSizeX);
        const newULCornerY = originalULCornerY + (crop.y * pixelSizeY);
        const newLLCornerY = newULCornerY + (crop.height * pixelSizeY);
        
        return {
            widthPx: crop.width,
            heightPx: crop.height,
            widthM: (crop.width * pixelSizeX).toFixed(2),
            heightM: (crop.height * Math.abs(pixelSizeY)).toFixed(2),
            originX: newULCornerX.toFixed(4),
            originY: newLLCornerY.toFixed(4), // Therion uses LLL Y
        };
    }, [crop, info]);


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
            <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col p-4 sm:p-6">
                <div className="text-center mb-4 flex-shrink-0">
                    <h2 className="text-2xl font-bold text-teal-400">{t('cropModal_title')}</h2>
                    <p className="text-gray-400 mt-1 text-sm">{t('cropModal_desc')}</p>
                </div>
                <div className="flex-grow flex flex-col lg:flex-row gap-4 sm:gap-6 min-h-0">
                    <div className="flex-grow lg:w-2/3 bg-gray-900 rounded-lg relative overflow-hidden flex items-center justify-center">
                        <div
                            ref={imageContainerRef}
                            className="relative"
                            style={{
                                aspectRatio: `${info.width} / ${info.height}`,
                                maxHeight: '100%',
                                maxWidth: '100%',
                            }}
                        >
                            <HillshadeCanvas {...info} />
                             <div className="absolute inset-0">
                                {/* Overlays to darken outside area */}
                                <div className="absolute left-0 top-0 w-full bg-black/60 pointer-events-none" style={{ height: `${(crop.y / info.height) * 100}%` }}></div>
                                <div className="absolute left-0 bottom-0 w-full bg-black/60 pointer-events-none" style={{ height: `${((info.height - (crop.y + crop.height)) / info.height) * 100}%` }}></div>
                                <div className="absolute left-0 bg-black/60 pointer-events-none" style={{ top: `${(crop.y / info.height) * 100}%`, height: `${(crop.height / info.height) * 100}%`, width: `${(crop.x / info.width) * 100}%` }}></div>
                                <div className="absolute right-0 bg-black/60 pointer-events-none" style={{ top: `${(crop.y / info.height) * 100}%`, height: `${(crop.height / info.height) * 100}%`, width: `${((info.width - (crop.x + crop.width)) / info.width) * 100}%` }}></div>
                                
                                {/* Crop Box */}
                                <div
                                    className="absolute border-2 border-red-500"
                                    style={{
                                        left: `${(crop.x / info.width) * 100}%`,
                                        top: `${(crop.y / info.height) * 100}%`,
                                        width: `${(crop.width / info.width) * 100}%`,
                                        height: `${(crop.height / info.height) * 100}%`,
                                    }}
                                >
                                    {/* Handles */}
                                    <div onMouseDown={(e) => handleMouseDown(e, 'top-left')} className="absolute -top-2 -left-2 w-4 h-4 bg-red-500 rounded-full cursor-nwse-resize border-2 border-gray-200"></div>
                                    <div onMouseDown={(e) => handleMouseDown(e, 'top-right')} className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full cursor-nesw-resize border-2 border-gray-200"></div>
                                    <div onMouseDown={(e) => handleMouseDown(e, 'bottom-left')} className="absolute -bottom-2 -left-2 w-4 h-4 bg-red-500 rounded-full cursor-nesw-resize border-2 border-gray-200"></div>
                                    <div onMouseDown={(e) => handleMouseDown(e, 'bottom-right')} className="absolute -bottom-2 -right-2 w-4 h-4 bg-red-500 rounded-full cursor-nwse-resize border-2 border-gray-200"></div>
                                    
                                    {/* Side grab handles (invisible) */}
                                    <div onMouseDown={(e) => handleMouseDown(e, 'top')} className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 h-3 w-10 cursor-ns-resize"></div>
                                    <div onMouseDown={(e) => handleMouseDown(e, 'bottom')} className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 h-3 w-10 cursor-ns-resize"></div>
                                    <div onMouseDown={(e) => handleMouseDown(e, 'left')} className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-10 cursor-ew-resize"></div>
                                    <div onMouseDown={(e) => handleMouseDown(e, 'right')} className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3 h-10 cursor-ew-resize"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex-shrink-0 lg:w-1/3 bg-gray-900/60 p-4 rounded-lg flex flex-col">
                        <h3 className="text-lg font-bold text-teal-400 mb-4">{t('cropModal_info')}</h3>
                        <div className="space-y-3">
                            <InfoItem label={t('preview_dimensions')} value={`${cropInfo.widthPx} x ${cropInfo.heightPx} px`} />
                            <InfoItem label={t('preview_resolution')} value={`${cropInfo.widthM} x ${cropInfo.heightM} m`} />
                            <div className="pt-2 border-t border-gray-700">
                                <p className="text-sm text-gray-400 mb-2">{t('cropModal_coords')}</p>
                                <InfoItem label="X (ull)" value={cropInfo.originX} />
                                <InfoItem label="Y (lll)" value={cropInfo.originY} />
                            </div>
                        </div>
                        <div className="mt-auto pt-4 space-y-3">
                           <button onClick={() => onConvert(crop)} className="w-full bg-teal-500 hover:bg-teal-600 text-white font-bold py-3 px-4 rounded-lg transition-colors">
                                {t('cropModal_applyButton')}
                            </button>
                            <button onClick={onClose} className="w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 px-4 rounded-lg transition-colors">
                                {t('cropModal_cancelButton')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
