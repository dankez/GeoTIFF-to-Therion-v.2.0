
import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '../LanguageContext';
import { LoadingSpinner, MapPinIcon, DownloadIcon } from './Icons';
import { fetchOpenTopography, fetchCuzkDmr5g, fetchCuzkDmpOk, isLocationInCzechia } from '../elevationServices';

interface AutoDownloadProps {
    onDownloadSuccess: (data: ArrayBuffer, filename: string, source: string, lat: number, lon: number) => void;
    onError: (msg: string) => void;
    isProcessing: boolean;
}

// Backup keys to use if the demo key (or user key) hits a rate limit
const FALLBACK_KEYS = [
    '40caf5ceb9bca47c3c200ba60f622c27'
];

const INTERESTING_LOCATIONS = [
    { name: 'Jeskyně Macocha (CZ)', lat: 49.3736, lon: 16.7339, provider: 'cuzk' },
    { name: 'Krakova hoľa (SK)', lat: 48.9639, lon: 19.6472, provider: 'opentopography' },
    { name: 'Kresanica (SK/PL)', lat: 49.2272, lon: 19.9239, provider: 'opentopography' },
    { name: 'Zádiel (SK)', lat: 48.6083, lon: 20.8250, provider: 'opentopography' },
    { name: 'Eisriesenwelt (AT)', lat: 47.5056, lon: 13.1994, provider: 'opentopography' },
    { name: 'Gouffre de Padirac (FR)', lat: 44.8533, lon: 1.6733, provider: 'opentopography' },
    { name: 'Postojna Cave (SI)', lat: 45.7825, lon: 14.2017, provider: 'opentopography' },
    { name: 'Škocjan Caves (SI)', lat: 45.6639, lon: 13.9939, provider: 'opentopography' },
    { name: 'Grotta Gigante (IT)', lat: 45.7139, lon: 13.7639, provider: 'opentopography' },
    { name: 'Domica (SK)', lat: 48.4833, lon: 20.4667, provider: 'opentopography' },
];

export const AutoDownload: React.FC<AutoDownloadProps> = ({ onDownloadSuccess, onError, isProcessing }) => {
    const { t } = useTranslation();
    const [loadingLocation, setLoadingLocation] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [provider, setProvider] = useState<'auto' | 'opentopography' | 'cuzk'>('auto');
    const [useDmpOk, setUseDmpOk] = useState<boolean>(false);

    const [lat, setLat] = useState<string>('49.008450');
    const [lon, setLon] = useState<string>('19.682428');
    
    // ... (rest of the component)

    const handleLocationSelect = (loc: typeof INTERESTING_LOCATIONS[0]) => {
        setLat(loc.lat.toFixed(6));
        setLon(loc.lon.toFixed(6));
        setProvider(loc.provider as 'cuzk' | 'opentopography');
    };

    // ... (inside the component's JSX)
    // Add a select element for locations
    <select onChange={(e) => {
        const loc = INTERESTING_LOCATIONS.find(l => l.name === e.target.value);
        if (loc) handleLocationSelect(loc);
    }}>
        <option value="">Select a location...</option>
        {INTERESTING_LOCATIONS.map(loc => (
            <option key={loc.name} value={loc.name}>{loc.name}</option>
        ))}
    </select>
    
    // Dimensions in meters
    const [dims, setDims] = useState({ top: 500, bottom: 500, left: 500, right: 500 });
    
    // API Key (defaulting to the demo key mentioned in docs, but editable)
    const [apiKey, setApiKey] = useState('demoapikeyot2022');

    const getBestProvider = useCallback((l: number, ln: number) => {
        return isLocationInCzechia(l, ln) ? 'cuzk' : 'opentopography';
    }, []);

    const handleGetLocation = () => {
        if (!navigator.geolocation) {
            onError('Geolocation is not supported by your browser.');
            return;
        }
        setLoadingLocation(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const l = position.coords.latitude;
                const ln = position.coords.longitude;
                setLat(l.toFixed(6));
                setLon(ln.toFixed(6));
                if (provider === 'auto') {
                    // This will be handled by useEffect
                }
                setLoadingLocation(false);
            },
            (error) => {
                console.error(error);
                onError('Unable to retrieve your location.');
                setLoadingLocation(false);
            }
        );
    };

    // Auto-detect provider when lat/lon changes
    useEffect(() => {
        if (provider === 'auto') {
            // No action needed here as the provider is determined in handleDownload
        }
    }, [lat, lon, provider]);

    const handleDownload = async () => {
        const nLat = parseFloat(lat);
        const nLon = parseFloat(lon);

        if (isNaN(nLat) || isNaN(nLon)) {
            onError(t('auto_error_coords'));
            return;
        }
        if (nLat < -90 || nLat > 90 || nLon < -180 || nLon > 180) {
             onError(t('auto_error_coords_range'));
             return;
        }

        setDownloading(true);
        
        let success = false;
        let lastError: any = null;

        const activeProvider = provider === 'auto' ? getBestProvider(nLat, nLon) : provider;

        try {
            if (activeProvider === 'opentopography') {
                if (!apiKey.trim()) {
                    onError(t('auto_error_apikey'));
                    setDownloading(false);
                    return;
                }
                
                // Prepare list of keys to try
                let keysToTry = [apiKey.trim()];
                if (apiKey.trim() === 'demoapikeyot2022') {
                    keysToTry = [...keysToTry, ...FALLBACK_KEYS];
                }
                keysToTry = [...new Set(keysToTry)];

                for (const currentKey of keysToTry) {
                    try {
                        const buffer = await fetchOpenTopography(nLat, nLon, dims, currentKey);
                        const filename = `AW3D30_${nLat.toFixed(4)}_${nLon.toFixed(4)}`;
                        onDownloadSuccess(buffer, filename, 'OpenTopography', nLat, nLon);
                        success = true;
                        break;
                    } catch (e: any) {
                        console.warn(`API Key '${currentKey.substring(0,4)}...' failed:`, e.message);
                        lastError = e;
                    }
                }
            } else if (activeProvider === 'cuzk') {
                // ČÚZK
                try {
                    let buffer;
                    let filename;
                    let source;
                    
                    if (useDmpOk) {
                        buffer = await fetchCuzkDmpOk(nLat, nLon, dims);
                        filename = `DMP_OK_${nLat.toFixed(4)}_${nLon.toFixed(4)}`;
                        source = 'ČÚZK DMP OK';
                    } else {
                        buffer = await fetchCuzkDmr5g(nLat, nLon, dims);
                        filename = `DMR5G_${nLat.toFixed(4)}_${nLon.toFixed(4)}`;
                        source = 'ČÚZK DMR 5G';
                    }
                    
                    onDownloadSuccess(buffer, filename, source, nLat, nLon);
                    success = true;
                } catch (e: any) {
                    console.error('ČÚZK download failed:', e);
                    lastError = e;
                }
            }

        } catch (e: any) {
            console.error(e);
            lastError = e;
        }

        if (!success) {
            console.error("Download failed.");
            onError(lastError?.message || 'Unknown error during download. Please try again later.');
        }
        
        setDownloading(false);
    };

    const activeProvider = provider === 'auto' ? getBestProvider(parseFloat(lat), parseFloat(lon)) : provider;

    return (
        <div className="space-y-6 w-full">
            <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-200 mb-2">{t('auto_title')}</h3>
                <p className="text-sm text-gray-400">{t('auto_desc')}</p>
                <div className="mt-3 text-xs text-gray-500 bg-gray-900/40 p-3 rounded-md max-w-2xl mx-auto">
                    {t('auto_explanation')}
                </div>
            </div>

            {/* Provider Selection */}
            <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                <label className="block text-sm font-bold text-teal-400 uppercase tracking-wider mb-2">
                    Provider ({activeProvider === 'cuzk' ? (useDmpOk ? 'ČÚZK DMP OK' : 'ČÚZK DMR 5G') : 'OpenTopography'})
                </label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                    <button 
                        onClick={() => setProvider('auto')}
                        className={`py-2 rounded ${provider === 'auto' ? 'bg-teal-500 text-white' : 'bg-gray-700 text-gray-300'}`}
                    >
                        Auto
                    </button>
                    <button 
                        onClick={() => setProvider('opentopography')}
                        className={`py-2 rounded ${provider === 'opentopography' ? 'bg-teal-500 text-white' : 'bg-gray-700 text-gray-300'}`}
                    >
                        OpenTopography
                    </button>
                    <button 
                        onClick={() => setProvider('cuzk')}
                        className={`py-2 rounded ${provider === 'cuzk' ? 'bg-teal-500 text-white' : 'bg-gray-700 text-gray-300'}`}
                    >
                        ČÚZK
                    </button>
                </div>
                {activeProvider === 'cuzk' && (
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm text-gray-300">
                            <input 
                                type="checkbox" 
                                checked={useDmpOk} 
                                onChange={(e) => {
                                    setUseDmpOk(e.target.checked);
                                }}
                                className="form-checkbox h-4 w-4 text-teal-500"
                            />
                            vegetáciu a budovy - obrazová_korelace
                        </label>
                    </div>
                )}
            </div>

            {/* GPS Input Section */}
            <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                <div className="flex justify-between items-center mb-4">
                    <label className="text-sm font-bold text-teal-400 uppercase tracking-wider">{t('auto_location')}</label>
                    <button 
                        onClick={handleGetLocation} 
                        disabled={loadingLocation || isProcessing || downloading}
                        className="text-xs flex items-center gap-1 text-blue-400 hover:text-blue-300 disabled:text-gray-600 transition-colors"
                    >
                        {loadingLocation ? <LoadingSpinner /> : <MapPinIcon className="w-3 h-3" />}
                        {t('auto_use_current')}
                    </button>
                </div>
                <select 
                    className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white text-sm mb-4 focus:border-teal-500 focus:outline-none"
                    onChange={(e) => {
                        const loc = INTERESTING_LOCATIONS.find(l => l.name === e.target.value);
                        if (loc) handleLocationSelect(loc);
                    }}
                    value=""
                >
                    <option value="" disabled>Select an interesting location...</option>
                    {INTERESTING_LOCATIONS.map(loc => (
                        <option key={loc.name} value={loc.name}>{loc.name}</option>
                    ))}
                </select>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Latitude (WGS84)</label>
                        <input 
                            type="number" 
                            step="any"
                            value={lat}
                            onChange={(e) => setLat(e.target.value)}
                            placeholder="48.1234"
                            className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white focus:border-teal-500 focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Longitude (WGS84)</label>
                        <input 
                            type="number" 
                            step="any"
                            value={lon}
                            onChange={(e) => setLon(e.target.value)}
                            placeholder="19.5678"
                            className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white focus:border-teal-500 focus:outline-none"
                        />
                    </div>
                </div>
            </div>

            {/* Dimensions Section */}
            <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                <label className="block text-sm font-bold text-teal-400 uppercase tracking-wider mb-4">{t('auto_dimensions_m')}</label>
                <div className="grid grid-cols-3 gap-2 items-center justify-items-center">
                    <div className="col-start-2">
                        <label className="block text-center text-xs text-gray-500 mb-1">{t('auto_dim_north')}</label>
                        <input type="number" value={dims.top} onChange={(e) => setDims({...dims, top: parseInt(e.target.value)||0})} className="w-20 bg-gray-900 border border-gray-600 rounded p-1 text-center text-white text-sm" />
                    </div>
                    <div className="col-start-1 row-start-2">
                        <label className="block text-center text-xs text-gray-500 mb-1">{t('auto_dim_west')}</label>
                        <input type="number" value={dims.left} onChange={(e) => setDims({...dims, left: parseInt(e.target.value)||0})} className="w-20 bg-gray-900 border border-gray-600 rounded p-1 text-center text-white text-sm" />
                    </div>
                    <div className="col-start-2 row-start-2 flex items-center justify-center">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    </div>
                    <div className="col-start-3 row-start-2">
                        <label className="block text-center text-xs text-gray-500 mb-1">{t('auto_dim_east')}</label>
                        <input type="number" value={dims.right} onChange={(e) => setDims({...dims, right: parseInt(e.target.value)||0})} className="w-20 bg-gray-900 border border-gray-600 rounded p-1 text-center text-white text-sm" />
                    </div>
                    <div className="col-start-2 row-start-3">
                        <input type="number" value={dims.bottom} onChange={(e) => setDims({...dims, bottom: parseInt(e.target.value)||0})} className="w-20 bg-gray-900 border border-gray-600 rounded p-1 text-center text-white text-sm" />
                        <label className="block text-center text-xs text-gray-500 mt-1">{t('auto_dim_south')}</label>
                    </div>
                </div>
            </div>

            {/* API Key Section */}
            {activeProvider === 'opentopography' && (
                <div>
                    <div className="flex justify-between items-baseline mb-1">
                        <label className="block text-xs text-gray-500">OpenTopography API Key</label>
                        <a href="https://my.opentopography.org/login" target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-400 hover:text-blue-300 underline">
                            {t('auto_get_apikey')}
                        </a>
                    </div>
                    <input 
                        type="text" 
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        className="w-full bg-gray-900/50 border border-gray-700 rounded p-2 text-gray-300 text-xs focus:border-teal-500 focus:outline-none"
                    />
                    <p className="text-[10px] text-gray-600 mt-1">Default: OpenTopography Demo Key (Limited access)</p>
                </div>
            )}

            {/* Action Button */}
            <button
                onClick={handleDownload}
                disabled={downloading || isProcessing}
                className="w-full flex items-center justify-center gap-3 text-lg font-bold px-8 py-4 rounded-full bg-teal-500 text-white shadow-lg hover:bg-teal-600 disabled:bg-gray-700 disabled:cursor-not-allowed transition-all duration-300"
            >
                {downloading ? (
                    <>
                        <LoadingSpinner />
                        <span>{t('auto_downloading')}</span>
                    </>
                ) : isProcessing ? (
                    <>
                        <LoadingSpinner />
                        <span>{t('parsing')}</span>
                    </>
                ) : (
                    <>
                        <DownloadIcon />
                        <span>{t('auto_download_btn')}</span>
                    </>
                )}
            </button>
        </div>
    );
};
