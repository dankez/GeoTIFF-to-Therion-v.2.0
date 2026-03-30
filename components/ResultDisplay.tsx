
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { TherionData, GeneratedImage, ParsedInfo } from '../types';
import { DownloadIcon, RestartIcon, CopyIcon, CheckCircleIcon, ArchiveIcon, LoadingSpinner, MagnifyingGlassPlusIcon, SettingsIcon, CubeIcon, MapIcon, PyramidIcon } from './Icons';
import { useTranslation, TranslationKey } from '../LanguageContext';
import { ImageModal } from './ImageModal';
import { COLOR_PALETTES, ColorPalette } from '../colorPalettes';
import { generateColorReliefBlob, generateHillshadeBlob } from '../imageGeneration';
import { generateDxfContent } from '../dxfGeneration';
import { generateStlContent } from '../stlGeneration';

// Module-level cache for JSZip to avoid re-importing
let jszipModule: any = null;

// Helper to dynamically load the JSZip library for creating zip files
const loadJSZip = async (): Promise<any> => {
    if (jszipModule) {
        return jszipModule;
    }
    try {
        const jszip = await import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm');
        jszipModule = jszip.default;
        return jszipModule;
    } catch (error) {
        console.error("JSZip dynamic import from CDN failed:", error);
        jszipModule = null; 
        throw new Error('Failed to load the zipping library. Please check your internet connection.');
    }
};

const CodeBlock: React.FC<{ title: string; content: string; language?: string, previewLength?: number }> = ({ title, content, previewLength }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(content).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }, (err) => {
            console.error('Failed to copy text: ', err);
        });
    };
    const displayContent = previewLength ? content.substring(0, previewLength) + (content.length > previewLength ? '...' : '') : content;
    return (
        <div className="bg-gray-900/50 rounded-lg overflow-hidden h-full flex flex-col">
            <div className="px-4 py-2 bg-gray-700/50 flex justify-between items-center">
                <h3 className="text-sm font-semibold text-gray-300">{title}</h3>
                <button onClick={handleCopy} className="text-gray-400 hover:text-white transition-colors p-1 -mr-1" aria-label={`Copy ${title} to clipboard`}>
                    {copied ? <CheckCircleIcon className="w-4 h-4 text-teal-400" /> : <CopyIcon className="w-4 h-4" />}
                </button>
            </div>
            <pre className="p-4 text-xs text-gray-300 overflow-x-auto flex-grow">
                <code>{displayContent}</code>
            </pre>
        </div>
    );
};

const FileResultCard: React.FC<{ filename: string; content: string; info: string; previewLength?: number }> = ({ filename, content, info, previewLength }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(content).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }, (err) => {
            console.error('Failed to copy text: ', err);
        });
    };
    const displayContent = previewLength ? content.substring(0, previewLength) + (content.length > previewLength ? '...' : '') : content;
    return (
        <div className="bg-gray-900/50 rounded-lg overflow-hidden h-full flex flex-col border border-gray-700">
            <div className="px-4 py-3 bg-gray-800/50 flex justify-between items-center border-b border-gray-700">
                <div className="flex-1 min-w-0 mr-4">
                    <h3 className="text-sm font-bold text-gray-200 truncate" title={filename}>{filename}</h3>
                    <p className="text-xs text-gray-500 mt-0.5 truncate" title={info}>{info}</p>
                </div>
                <button onClick={handleCopy} className="text-gray-400 hover:text-white transition-colors p-1.5 rounded-md hover:bg-gray-700" aria-label={`Copy ${filename} to clipboard`}>
                    {copied ? <CheckCircleIcon className="w-5 h-5 text-teal-400" /> : <CopyIcon className="w-5 h-5" />}
                </button>
            </div>
            <pre className="p-4 text-xs text-gray-300 overflow-auto flex-grow font-mono whitespace-pre-wrap break-all max-h-[300px]">
                <code>{displayContent}</code>
            </pre>
        </div>
    );
};

const PalettePicker: React.FC<{
    palettes: ColorPalette[];
    selectedId: string;
    onSelect: (id: string) => void;
}> = ({ palettes, selectedId, onSelect }) => {
    return (
        <div className="mt-4">
            <label className="block text-sm font-medium text-gray-300 mb-3">
                Škála pre farebný reliéf
            </label>
            <div className="flex flex-wrap gap-4">
                {palettes.map(palette => {
                    const isSelected = palette.id === selectedId;
                    const gradient = `linear-gradient(to right, ${palette.stops.map(s => `rgb(${s.color.join(',')})`).join(', ')})`;
                    return (
                        <div key={palette.id} className="flex flex-col items-center flex-1 min-w-[7rem]">
                            <button
                                type="button"
                                onClick={() => onSelect(palette.id)}
                                className={`w-full h-8 rounded-md border-2 transition-all duration-200 ${isSelected ? 'border-teal-400 scale-105 shadow-lg' : 'border-gray-600 hover:border-gray-400'}`}
                                style={{ background: gradient }}
                                aria-label={`Select ${palette.name} palette`}
                            />
                            <span className={`mt-2 text-xs text-center w-full ${isSelected ? 'text-teal-400 font-semibold' : 'text-gray-400'}`}>{palette.name}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};


const LocalReliefLegend: React.FC<{ minElevation: number, palette: ColorPalette }> = ({ minElevation, palette }) => {
    const localMaxElevation = minElevation + 500;
    const gradientColors = palette.stops.map(stop => `rgb(${stop.color.join(',')})`).join(', ');

    return (
        <div className="mt-4 px-1 text-sm w-full">
            <div 
                className="w-full h-5 rounded border border-gray-600" 
                style={{ background: `linear-gradient(to right, ${gradientColors})` }}
            />
            <div className="flex justify-between text-gray-300 font-mono text-xs mt-1">
                <span>{minElevation.toFixed(1)}m</span>
                <span>{localMaxElevation.toFixed(1)}m</span>
            </div>
             <div className="flex justify-between text-gray-400 text-xs mt-1 px-1">
                <span>{palette.legendLabels.bottom}</span>
                {palette.legendLabels.middleBottom && <span>{palette.legendLabels.middleBottom}</span>}
                 {palette.legendLabels.middleTop && <span>{palette.legendLabels.middleTop}</span>}
                <span>{palette.legendLabels.top}</span>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
                Farebná škála je optimalizovaná pre 500m prevýšenie.
            </p>
        </div>
    );
};

const ImageToolbar: React.FC<{
    onDownload: () => void;
    disabled: boolean;
}> = ({ onDownload, disabled }) => {
    const { t } = useTranslation();
    return (
        <div className="mt-4 flex justify-center">
            <button
                onClick={onDownload}
                disabled={disabled}
                className="flex items-center justify-center gap-2 px-6 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors duration-200 font-semibold rounded-md"
            >
                <DownloadIcon />
                <span>{t('downloadButton', 'JPG')}</span>
            </button>
        </div>
    );
};


export const ResultDisplay: React.FC<{ 
    data: TherionData; 
    sourceInfo: ParsedInfo;
    onReset: () => void;
    onRegenerate: (newFactor: number, newSource: string) => Promise<void>;
    isConverting: boolean;
}> = ({ data, sourceInfo, onReset, onRegenerate, isConverting }) => {
    const { t } = useTranslation();
    const [isZipping, setIsZipping] = useState(false);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    const [selectedPalette, setSelectedPalette] = useState<ColorPalette>(COLOR_PALETTES[0]);
    const [colorReliefImage, setColorReliefImage] = useState<GeneratedImage | null>(null);
    const [isRegeneratingRelief, setIsRegeneratingRelief] = useState<boolean>(true);
    const [newResampleFactor, setNewResampleFactor] = useState(data.resampleFactor);
    const [newSource, setNewSource] = useState(sourceInfo.source);

    // State for hillshade inversion
    const [isHillshadeInverted, setIsHillshadeInverted] = useState(false);
    const [isRegeneratingHillshade, setIsRegeneratingHillshade] = useState(false);
    const [hillshadeImages, setHillshadeImages] = useState<GeneratedImage[]>(data.generatedImages);

    const newDims = useMemo(() => {
        const factor = Math.max(1, Math.floor(newResampleFactor));
        return {
            width: Math.floor(sourceInfo.width / factor),
            height: Math.floor(sourceInfo.height / factor),
        };
    }, [newResampleFactor, sourceInfo]);

    // Calculate resolutions in meters for regeneration
    const { resMetersX, resMetersY } = useMemo(() => {
        let resX = data.dxPixelSizeX;
        let resY = Math.abs(data.dxPixelSizeY);

        if (data.coordinateSystem === 'wgs84' || data.coordinateSystem === 'lat-long') {
             const METERS_PER_DEG_LAT = 111320;
             // data.dxOriginY is Upper Left Y (Latitude)
             const centerLatDeg = data.dxOriginY - (data.height * resY / 2);
             const centerLatRad = centerLatDeg * (Math.PI / 180);
             const metersPerDegLon = METERS_PER_DEG_LAT * Math.cos(centerLatRad);
             
             resY = resY * METERS_PER_DEG_LAT;
             resX = resX * metersPerDegLon;
        }
        return { resMetersX: resX, resMetersY: resY };
    }, [data.dxPixelSizeX, data.dxPixelSizeY, data.coordinateSystem, data.dxOriginY, data.height]);

    useEffect(() => {
        setNewResampleFactor(data.resampleFactor);
        setNewSource(sourceInfo.source);
    }, [data.resampleFactor, sourceInfo.source]);

    // Regenerate hillshades when inversion changes
    useEffect(() => {
        const regenerate = async () => {
            // Check if we have valid images/data. If initial generation failed due to size, skip this.
            if (!data || data.generatedImages.length === 0) return;

            setIsRegeneratingHillshade(true);
            try {
                // Ensure we respect max canvas size limits during regeneration too (simplified check)
                const MAX_PIXELS = 16384 * 16384; 
                if (data.width * data.height > MAX_PIXELS) {
                     // Should have been caught by App.tsx, but just in case
                     throw new Error("Image too large");
                }

                const [classicBlob, contrastBlob] = await Promise.all([
                    generateHillshadeBlob(data.width, data.height, data.elevationData, resMetersX, resMetersY, {
                        contrast: 200, brightness: 55, filter: 'blur(0.3px) contrast(105%) brightness(102%)',
                        invert: isHillshadeInverted
                    }),
                    generateHillshadeBlob(data.width, data.height, data.elevationData, resMetersX, resMetersY, {
                        contrast: 255, brightness: 0, filter: 'blur(0.2px) contrast(110%)',
                        invert: isHillshadeInverted
                    })
                ]);
                setHillshadeImages([
                    { name: 'Classic', blob: classicBlob },
                    { name: 'High Contrast', blob: contrastBlob }
                ]);
            } catch (e) {
                console.error("Failed to regenerate inverted hillshade:", e);
                // On failure, revert to original images
                setHillshadeImages(data.generatedImages);
            }
            finally {
                setIsRegeneratingHillshade(false);
            }
        };
        regenerate();
    }, [isHillshadeInverted, data.width, data.height, data.elevationData, data.generatedImages, resMetersX, resMetersY]);


    useEffect(() => {
        const regenerateRelief = async () => {
             // If initial generation failed due to size, skip.
            if (data.generatedImages.length === 0) {
                 setIsRegeneratingRelief(false);
                 setColorReliefImage(null);
                 return;
            }

            setIsRegeneratingRelief(true);
            try {
                const blob = await generateColorReliefBlob(
                    data.width, data.height, data.elevationData, resMetersX, resMetersY, data.minElevation, selectedPalette.stops
                );
                setColorReliefImage({ name: 'Color Relief', blob });
            } catch (err) {
                console.error("Failed to regenerate color relief:", err);
                setColorReliefImage(null);
            } finally {
                setIsRegeneratingRelief(false);
            }
        };
        regenerateRelief();
    }, [selectedPalette, data, resMetersX, resMetersY]);

    const allImages = useMemo(() => {
        const images = [...hillshadeImages];
        if (colorReliefImage) {
            images.push(colorReliefImage);
        }
        return images;
    }, [hillshadeImages, colorReliefImage]);

    const selectedImage = useMemo(() => allImages[selectedImageIndex], [allImages, selectedImageIndex]);
    const imageUrl = useMemo(() => selectedImage?.blob ? URL.createObjectURL(selectedImage.blob) : '', [selectedImage]);
    const nameToKeyMap: { [key: string]: TranslationKey } = { 'Classic': 'imageName_classic', 'High Contrast': 'imageName_high_contrast', 'Color Relief': 'imageName_color_relief' };
    
    const finalThContent = useMemo(() => {
        const gridPart = `encoding utf-8\nsurface\n  cs ${data.coordinateSystem}\n  ${data.thGridLine}\n  input ${data.baseFilename}.txt\n`;
        let bitmapPart = '';
        
        if (selectedImage) {
            const imageName = `${data.baseFilename}_${selectedImage.name.toLowerCase().replace(/\s+/g, '_')}.jpg`;
            // Check if we need to switch CS for the bitmap (e.g. Grid is UTM, but Image is LatLong)
            const csSwitch = (data.bitmapCoordinateSystem && data.bitmapCoordinateSystem !== data.coordinateSystem) 
                ? `  cs ${data.bitmapCoordinateSystem}\n` 
                : '';
            
            bitmapPart = `${csSwitch}  bitmap ${imageName} ${data.bitmapCalibration}\n`;
        }
        
        return `${gridPart}${bitmapPart}endsurface\n`;
    }, [data, selectedImage]);

    useEffect(() => { return () => { if (imageUrl) URL.revokeObjectURL(imageUrl); }; }, [imageUrl]);

    const handleDownload = (content: string | Blob, filename: string) => {
        const blob = content instanceof Blob ? content : new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(url);
    };

    const handleDownloadJpg = () => {
        if (!selectedImage?.blob) return;
        const filename = `${data.baseFilename}_${selectedImage.name.toLowerCase().replace(/\s+/g, '_')}.jpg`;
        handleDownload(selectedImage.blob, filename);
    };

    const handleDownloadDxf = () => {
        const dxfContent = generateDxfContent(
            data.elevationData,
            data.width,
            data.height,
            data.dxOriginX,
            data.dxOriginY,
            data.dxPixelSizeX,
            data.dxPixelSizeY
        );
        handleDownload(dxfContent, `${data.baseFilename}.dxf`);
    };

    const handleDownloadStl = () => {
        const stlView = generateStlContent(
            data.elevationData,
            data.width,
            data.height,
            data.dxOriginX,
            data.dxOriginY,
            data.dxPixelSizeX,
            data.dxPixelSizeY
        );
        const blob = new Blob([stlView], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `${data.baseFilename}.stl`;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(url);
    };

    const handleDownloadRaw = () => {
        const { elevationData } = sourceInfo;
        const blob = new Blob([elevationData], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `${sourceInfo.filename}_raw.bin`;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(url);
    };
    
    const handleDownloadAll = async () => {
        setIsZipping(true);
        try {
            const JSZip = await loadJSZip();
            const zip = new JSZip();
            
            // Only add image if available
            if (selectedImage && selectedImage.blob) {
                const imageName = `${data.baseFilename}_${selectedImage.name.toLowerCase().replace(/\s+/g, '_')}.jpg`;
                zip.file(imageName, selectedImage.blob);
            }
            // Add TH file always (content generated in memo)
            zip.file(`${data.baseFilename}.th`, finalThContent);

            zip.file(`${data.baseFilename}.txt`, data.txtFile); // Uses the Blob directly
            zip.file('debug.log', data.debugLog);
            
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            handleDownload(zipBlob, `${data.baseFilename}.zip`);
        } catch (err: any) { console.error('Failed to create zip file:', err); }
        finally { setIsZipping(false); }
    };

    const handlePaletteChange = useCallback((id: string) => {
        const newPalette = COLOR_PALETTES.find(p => p.id === id);
        if (newPalette) setSelectedPalette(newPalette);
    }, []);
    
    const isHillshadeSelected = selectedImage?.name === 'Classic' || selectedImage?.name === 'High Contrast';

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-teal-400">{t('result_success')}</h2>
                <p className="text-gray-400 mt-1">{t('result_description')}</p>
                <div className="mt-2 inline-block bg-teal-900/30 border border-teal-700/50 rounded-full px-4 py-1">
                    <span className="text-sm text-teal-300 font-semibold">Zdroj: {sourceInfo.source}</span>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2 lg:col-span-1 flex flex-col bg-gray-900/40 p-4 rounded-lg">
                    <h3 className="text-lg font-bold text-teal-400 mb-3">{t('result_select_header')}</h3>
                    
                    {allImages.length > 0 ? (
                        <>
                            <div className="flex border-b border-gray-700 mb-3">
                                {allImages.map((image, index) => (
                                    <button key={image.name} onClick={() => setSelectedImageIndex(index)} className={`px-3 py-2 text-sm font-semibold transition-colors duration-200 ${selectedImageIndex === index ? 'text-teal-400 border-b-2 border-teal-400' : 'text-gray-400 hover:text-white border-b-2 border-transparent'}`}>
                                        {t(nameToKeyMap[image.name]!)}
                                    </button>
                                ))}
                            </div>
                            {selectedImage && (
                                <>
                                    <div className="relative group flex-grow bg-gray-800 rounded-md overflow-hidden border border-gray-700">
                                        <div onClick={() => setIsModalOpen(true)} className="cursor-pointer flex items-center justify-center w-full h-full">
                                            {(isRegeneratingRelief && selectedImage.name === 'Color Relief') || (isRegeneratingHillshade && isHillshadeSelected) ? (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <LoadingSpinner />
                                                </div>
                                            ) : (
                                                <img src={imageUrl} alt={t(nameToKeyMap[selectedImage.name]!)} 
                                                    className="max-w-full max-h-full object-contain" 
                                                />
                                            )}
                                            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                <MagnifyingGlassPlusIcon className="w-10 h-10 text-white" />
                                                <span className="text-white font-semibold mt-2">{t('imageModal_view')}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <p className="text-xs text-gray-500 mt-2 text-center">
                                        {t('result_gridInfo', data.height, data.width)}
                                    </p>
                                    
                                    <ImageToolbar 
                                        onDownload={handleDownloadJpg}
                                        disabled={(isRegeneratingRelief && selectedImage.name === 'Color Relief') || (isRegeneratingHillshade && isHillshadeSelected)}
                                    />
                                    
                                    {isHillshadeSelected && (
                                        <div className="mt-4 flex items-center justify-center gap-3">
                                            <label htmlFor="invert-toggle" className="text-sm font-medium text-gray-300 cursor-pointer">{t('invertColors')}</label>
                                            <button
                                                id="invert-toggle"
                                                role="switch"
                                                aria-checked={isHillshadeInverted}
                                                onClick={() => setIsHillshadeInverted(!isHillshadeInverted)}
                                                className={`${isHillshadeInverted ? 'bg-teal-500' : 'bg-gray-600'} relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900/40 focus:ring-teal-500`}
                                            >
                                                <span className={`${isHillshadeInverted ? 'translate-x-6' : 'translate-x-1'} inline-block w-4 h-4 transform bg-white rounded-full transition-transform`} />
                                            </button>
                                        </div>
                                    )}

                                    {selectedImage?.name === 'Color Relief' && (
                                        <>
                                            <PalettePicker palettes={COLOR_PALETTES} selectedId={selectedPalette.id} onSelect={handlePaletteChange} />
                                            <LocalReliefLegend minElevation={data.minElevation} palette={selectedPalette} />
                                        </>
                                    )}
                                </>
                            )}
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-400 bg-gray-800 rounded-lg">
                             <p className="text-center px-4">Image generation skipped due to large file size.<br/>Data files (.th, .txt) are still available.</p>
                        </div>
                    )}
                </div>

                <div className="md:col-span-2 lg:col-span-1 flex flex-col gap-6">
                    <div className="flex-grow"><CodeBlock title={`${data.baseFilename}.th`} content={finalThContent} /></div>

                    <div className="bg-gray-900/50 rounded-lg p-4 space-y-3 border border-gray-700">
                        <h4 className="text-base font-semibold text-gray-300 flex items-center gap-2">
                            <SettingsIcon className="w-5 h-5" />
                            {t('result_regenerate_title')}
                        </h4>
                        <div>
                            <label htmlFor="resample-factor-result" className="block text-sm font-medium text-gray-300 mb-2">
                                {t('preview_resample')}
                            </label>
                            <input 
                                type="number"
                                id="resample-factor-result"
                                min="1"
                                step="1"
                                value={newResampleFactor}
                                onChange={(e) => setNewResampleFactor(parseInt(e.target.value, 10) || 1)}
                                disabled={isConverting}
                                className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-gray-800 disabled:cursor-not-allowed"
                            />
                        </div>
                        <div>
                            <label htmlFor="source-select-result" className="block text-sm font-medium text-gray-300 mb-2">
                                Zdroj dát
                            </label>
                            <select
                                id="source-select-result"
                                value={newSource}
                                onChange={(e) => setNewSource(e.target.value)}
                                disabled={isConverting}
                                className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-gray-800 disabled:cursor-not-allowed"
                            >
                                <option value="OpenTopography">OpenTopography</option>
                                <option value="ČÚZK DMR 5G">ČÚZK DMR 5G</option>
                            </select>
                        </div>
                             <p className="text-xs text-gray-500 mt-2">
                               {t('result_regenerate_desc')}
                            </p>
                            <div className="text-center text-xs text-gray-400 mt-2 font-mono bg-gray-800 p-2 rounded-md">
                                {t('preview_resultingGrid')} {newDims.height} x {newDims.width} px
                            </div>
                        <button
                            onClick={() => onRegenerate(newResampleFactor, newSource)}
                            disabled={isConverting || (newResampleFactor === data.resampleFactor && newSource === sourceInfo.source)}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors duration-200 font-semibold"
                        >
                            {isConverting ? <LoadingSpinner /> : <RestartIcon className="h-5 w-5" />}
                            <span>{t('result_regenerate_button')}</span>
                        </button>
                    </div>

                    <button onClick={() => handleDownload(finalThContent, `${data.baseFilename}.th`)} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 font-semibold">
                        <DownloadIcon /> {t('downloadButton', 'th')}
                    </button>
                </div>

                <FileResultCard filename={`${data.baseFilename}.txt`} content={data.txtPreview} info={t('result_gridInfo', data.height, data.width)} previewLength={1000} />
                <FileResultCard filename="debug.log" content={data.debugLog} info={t('result_debugInfo')} previewLength={300} />
            </div>

            <div className="pt-4 flex flex-col sm:flex-row justify-center items-center gap-4">
                 <button onClick={handleDownloadAll} disabled={isZipping || isConverting} className="flex items-center justify-center gap-3 w-full sm:w-auto text-lg font-bold px-8 py-4 rounded-full bg-teal-500 text-white shadow-lg hover:bg-teal-600 disabled:bg-gray-600 disabled:cursor-not-allowed disabled:shadow-none transition-all duration-300 ease-in-out transform hover:scale-105 disabled:scale-100">
                    {isZipping ? (<><LoadingSpinner /><span>{t('zipping')}</span></>) : (<><MapIcon /><span>{t('downloadAllButton')}</span></>)}
                </button>
                <div className="flex gap-2 w-full sm:w-auto">
                    <button onClick={handleDownloadDxf} disabled={isConverting} className="flex items-center justify-center gap-2 flex-1 sm:flex-initial text-lg font-bold px-6 py-4 rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-500 transition-all duration-300 ease-in-out">
                        <CubeIcon /><span>{t('downloadDxfButton')}</span>
                    </button>
                    <button onClick={handleDownloadStl} disabled={isConverting} className="flex items-center justify-center gap-2 flex-1 sm:flex-initial text-lg font-bold px-6 py-4 rounded-full bg-indigo-800 text-white shadow-lg hover:bg-indigo-700 transition-all duration-300 ease-in-out">
                        <PyramidIcon /><span>{t('downloadStlButton')}</span>
                    </button>
                    <button onClick={handleDownloadRaw} disabled={isConverting} className="flex items-center justify-center gap-2 flex-1 sm:flex-initial text-lg font-bold px-6 py-4 rounded-full bg-emerald-700 text-white shadow-lg hover:bg-emerald-600 transition-all duration-300 ease-in-out">
                        <ArchiveIcon /><span>Raw</span>
                    </button>
                </div>
                 <button onClick={onReset} className="flex items-center justify-center gap-3 w-full sm:w-auto text-lg font-bold px-8 py-4 rounded-full bg-gray-600 text-white shadow-lg hover:bg-gray-500 transition-all duration-300 ease-in-out">
                    <RestartIcon /><span>{t('newConversionButton')}</span>
                </button>
            </div>
            {isModalOpen && <ImageModal blob={selectedImage?.blob ?? null} onClose={() => setIsModalOpen(false)} />}
        </div>
    );
};
