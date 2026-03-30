
import React, { useMemo } from 'react';
import { ParsedInfo } from '../types';
import { ConvertIcon, InfoIcon, LoadingSpinner, SettingsIcon, SparklesIcon } from './Icons';
import { useTranslation } from '../LanguageContext';
import { HillshadeCanvas } from './HillshadeCanvas';

interface PreviewAndSettingsProps {
    info: ParsedInfo;
    resampleFactor: number;
    onFactorChange: (factor: number) => void;
    coordinateSystem: string;
    onCoordinateSystemChange: (cs: string) => void;
    onConvert: () => void;
    isConverting: boolean;
    conversionStatus: string;
    onCrop: () => void;
}

const InfoItem: React.FC<{ label: string; value: string | React.ReactNode }> = ({ label, value }) => (
    <div className="flex justify-between text-sm">
        <span className="text-gray-400">{label}:</span>
        <span className="font-mono text-gray-200">{value}</span>
    </div>
);

export const PreviewAndSettings: React.FC<PreviewAndSettingsProps> = ({ 
    info, 
    resampleFactor, 
    onFactorChange, 
    coordinateSystem,
    onCoordinateSystemChange,
    onConvert, 
    isConverting,
    conversionStatus,
    onCrop
}) => {
    const { t } = useTranslation();

    const COORDINATE_SYSTEMS = useMemo(() => [
        { id: 'ijtsk', name: t('cs_ijtsk_name'), example: t('cs_ijtsk_example') },
        { id: 'jtsk', name: t('cs_jtsk_name'), example: t('cs_jtsk_example') },
        { id: 'utm33n', name: t('cs_utm33n_name'), example: t('cs_utm33n_example') },
        { id: 'utm34n', name: t('cs_utm34n_name'), example: t('cs_utm34n_example') },
        { id: 'wgs84', name: t('cs_wgs84_name'), example: t('cs_wgs84_example') },
    ], [t]);

    const factor = Math.max(1, Math.floor(resampleFactor));
    const newWidth = Math.floor(info.width / factor);
    const newHeight = Math.floor(info.height / factor);
    const newPixelSizeX = info.pixelSizeX * factor;
    const newPixelSizeY = Math.abs(info.pixelSizeY * factor);

    const selectedSystemInfo = useMemo(() => {
        return COORDINATE_SYSTEMS.find(cs => cs.id === coordinateSystem);
    }, [coordinateSystem, COORDINATE_SYSTEMS]);

    const isWGS84 = coordinateSystem === 'wgs84';
    const resUnit = isWGS84 ? 'deg' : 'm';
    // For degrees, show more decimals (e.g., 0.00027778)
    const displayResX = isWGS84 ? newPixelSizeX.toFixed(8) : newPixelSizeX.toFixed(2);
    const displayResY = isWGS84 ? newPixelSizeY.toFixed(8) : newPixelSizeY.toFixed(2);

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Visual Preview Section */}
                <div className="bg-gray-900/40 p-4 rounded-lg space-y-3 flex flex-col items-center">
                     <h3 className="text-lg font-bold text-teal-400 w-full mb-2">
                        {t('preview_visual')}
                    </h3>
                    <div className="w-full aspect-video bg-gray-800 rounded-md overflow-hidden border border-gray-700">
                        <HillshadeCanvas 
                            width={info.width}
                            height={info.height}
                            elevationData={info.elevationData}
                            minElevation={info.minElevation}
                            maxElevation={info.maxElevation}
                        />
                    </div>
                </div>

                {/* Settings Section */}
                 <div className="bg-gray-900/40 p-4 rounded-lg space-y-3 flex flex-col">
                    <h3 className="text-lg font-bold text-teal-400 flex items-center gap-2">
                        <SettingsIcon className="w-5 h-5" />
                        {t('preview_settings')}
                    </h3>
                    <div>
                        <label htmlFor="cs-select" className="block text-sm font-medium text-gray-300 mb-2">
                            {t('preview_cs')}
                        </label>
                        <select
                            id="cs-select"
                            value={coordinateSystem}
                            onChange={(e) => onCoordinateSystemChange(e.target.value)}
                            className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                        >
                           {COORDINATE_SYSTEMS.map(cs => (
                               <option key={cs.id} value={cs.id}>{cs.name}</option>
                           ))}
                        </select>
                        {selectedSystemInfo && (
                            <p className="text-xs text-gray-500 mt-2 font-mono">
                                {selectedSystemInfo.example}
                            </p>
                        )}
                    </div>
                                        
                    <div>
                        <label htmlFor="resample-factor" className="block text-sm font-medium text-gray-300 mb-2 mt-3">
                            {t('preview_resample')}
                        </label>
                        <input 
                            type="number"
                            id="resample-factor"
                            min="1"
                            step="1"
                            value={resampleFactor}
                            onChange={(e) => onFactorChange(parseInt(e.target.value, 10) || 1)}
                            className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                         <p className="text-xs text-gray-500 mt-2">
                           {t('preview_resample_desc')}
                        </p>
                    </div>
                     <div className="border-t border-gray-700 pt-3 space-y-2 mt-auto">
                         <h4 className="text-sm font-semibold text-gray-400">{t('preview_resultingGrid')}</h4>
                        <InfoItem label={t('preview_newDimensions')} value={`${newWidth} x ${newHeight} px`} />
                        <InfoItem label={t('preview_newResolution')} value={`${displayResX} x ${displayResY} ${resUnit}`} />
                    </div>
                </div>
            </div>

            {info.gdalInfo && (
                <div className="bg-gray-900/40 p-4 rounded-lg">
                    <h3 className="text-lg font-bold text-teal-400 mb-2">
                        {t('preview_dataInfo')}
                    </h3>
                    <pre className="p-4 bg-gray-800 rounded-md text-xs text-gray-300 overflow-x-auto max-h-[250px] font-mono">
                        <code>{info.gdalInfo}</code>
                    </pre>
                </div>
            )}

             <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                 <button
                    onClick={onCrop}
                    disabled={isConverting}
                    className="flex items-center justify-center gap-3 w-full sm:w-auto text-lg font-bold px-8 py-4 rounded-full bg-gray-600 text-white shadow-lg hover:bg-gray-500 transition-all duration-300 ease-in-out disabled:bg-gray-700 disabled:cursor-not-allowed"
                 >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121M12 12l2.879-2.879M12 12L9.121 14.879M3 4h18v2H3V4zm0 14h18v2H3v-2z" /></svg>
                    <span>{t('cropButton')}</span>
                 </button>
                <button
                    onClick={onConvert}
                    disabled={isConverting}
                    className="flex items-center justify-center gap-3 w-full sm:w-auto text-lg font-bold px-8 py-4 rounded-full bg-teal-500 text-white shadow-lg hover:bg-teal-600 disabled:bg-gray-600 disabled:cursor-not-allowed disabled:shadow-none transition-all duration-300 ease-in-out transform hover:scale-105 disabled:scale-100"
                >
                    {isConverting ? (
                        <>
                            <LoadingSpinner />
                            <span>{conversionStatus || t('converting')}</span>
                        </>
                    ) : (
                        <>
                            <ConvertIcon />
                            <span>{t('convertButton')}</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};
