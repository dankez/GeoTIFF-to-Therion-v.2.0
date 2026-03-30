import React, { useState, useCallback, useEffect } from 'react';
import { TherionData, TfwData, ParsedInfo, GeneratedImage } from './types';
import { FileInput } from './components/FileInput';
import { ResultDisplay } from './components/ResultDisplay';
import { LoadingSpinner, UploadIcon, SatelliteIcon, LlamaHillsIcon } from './components/Icons';
import { PreviewAndSettings } from './components/PreviewAndSettings';
import { useTranslation, TranslationKey } from './LanguageContext';
import { Instructions } from './components/Instructions';
import { CropModal } from './components/CropModal';
import { COLOR_PALETTES, ColorStop, getColorForRelief } from './colorPalettes';
import { generateHillshadeBlob } from './imageGeneration';
import { AutoDownload } from './components/AutoDownload';

// Module-level cache for the GeoTIFF library
let geoTiffModule: any = null;

// Module-level cache for Proj4
let proj4Module: any = null;

// Helper to dynamically load the GeoTIFF library
const loadGeoTIFF = async (): Promise<any> => {
  if (geoTiffModule) return geoTiffModule;
  try {
    geoTiffModule = await import('https://cdn.jsdelivr.net/npm/geotiff@2.1.4-beta.0/+esm');
    return geoTiffModule;
  } catch (error) {
    console.error("GeoTIFF dynamic import from CDN failed:", error);
    geoTiffModule = null;
    throw new Error('Failed to load the GeoTIFF library from the CDN. Please check your internet connection.');
  }
};

// Helper to dynamically load Proj4
const loadProj4 = async (): Promise<any> => {
  if (proj4Module) return proj4Module;
  try {
    const mod = await import('https://cdn.jsdelivr.net/npm/proj4@2.9.0/+esm');
    proj4Module = mod.default;
    return proj4Module;
  } catch (error) {
    console.error("Proj4 dynamic import failed:", error);
    throw new Error('Failed to load projection library.');
  }
};

const isNoData = (value: number, noDataValue: number | null | undefined): boolean => {
  if (!isFinite(value)) return true;
  if (noDataValue !== null && typeof noDataValue !== 'undefined' && isFinite(noDataValue)) {
    if (Math.abs(noDataValue) > 3e38) return Math.abs(value) > 3e38;
    if (Math.abs(value - noDataValue) < 1e-6) return true;
  }
  if(Math.abs(value) > 3e38) return true;
  return false;
};

// Helper for bilinear interpolation
const interpolateElevation = (
  data: Float32Array | number[],
  width: number,
  height: number,
  x: number,
  y: number,
  noDataValue?: number | null
): number => {
  const x1 = Math.floor(x);
  const y1 = Math.floor(y);
  const x2 = x1 + 1;
  const y2 = y1 + 1;

  // Boundary check - if completely outside, return 0 or nearest
  if (x1 < 0 || x1 >= width || y1 < 0 || y1 >= height) {
    // Clamp to edge for simple boundary handling
    const cx = Math.max(0, Math.min(width - 1, Math.round(x)));
    const cy = Math.max(0, Math.min(height - 1, Math.round(y)));
    return data[cy * width + cx];
  }

  // Check bounds for neighbors
  const getVal = (cX: number, cY: number) => {
    if (cX < 0 || cX >= width || cY < 0 || cY >= height) return data[y1 * width + x1]; // fallback
    return data[cY * width + cX];
  };

  const q11 = getVal(x1, y1);
  const q21 = getVal(x2, y1);
  const q12 = getVal(x1, y2);
  const q22 = getVal(x2, y2);

  // Check NoData
  if (isNoData(q11, noDataValue) || isNoData(q21, noDataValue) || isNoData(q12, noDataValue) || isNoData(q22, noDataValue)) {
    return q11; // Fallback to nearest valid or keep nodata
  }

  const wx2 = x - x1;
  const wx1 = 1 - wx2;
  const wy2 = y - y1;
  const wy1 = 1 - wy2;

  return (q11 * wx1 * wy1 + q21 * wx2 * wy1 + q12 * wx1 * wy2 + q22 * wx2 * wy2);
};

const createCroppedInfo = (
  originalParsedInfo: ParsedInfo,
  cropRect: { x: number; y: number; width: number; height: number; }
): ParsedInfo => {
  const { elevationData, width: oldWidth, pixelSizeX, pixelSizeY, originX: originalOriginX, originY: originalOriginY, tfwData } = originalParsedInfo;
  const newElevationData = new Float32Array(cropRect.width * cropRect.height);

  for (let y = 0; y < cropRect.height; y++) {
    const sourceY = cropRect.y + y;
    const startIndex = sourceY * oldWidth + cropRect.x;
    const endIndex = startIndex + cropRect.width;
    let row: Float32Array | number[];
    if (Array.isArray(elevationData)) {
      row = elevationData.slice(startIndex, endIndex);
    } else {
      row = elevationData.subarray(startIndex, endIndex);
    }
    newElevationData.set(row, y * cropRect.width);
  }

  // Calculate new Top-Left Origin
  const newULCornerX = originalOriginX + (cropRect.x * pixelSizeX);
  const newULCornerY = originalOriginY + (cropRect.y * pixelSizeY); // pixelSizeY is typically negative

  let minElevation = Infinity, maxElevation = -Infinity;
  for(let i=0; i<newElevationData.length; i++) {
    const e = newElevationData[i];
    if(!isFinite(e)) continue;
    if(e < minElevation) minElevation = e;
    if(e > maxElevation) maxElevation = e;
  }

  return {
    ...originalParsedInfo,
    width: cropRect.width,
    height: cropRect.height,
    elevationData: newElevationData,
    originX: newULCornerX,
    originY: newULCornerY,
    minElevation,
    maxElevation,
    tfwData: {
      ...tfwData,
      centerX: tfwData.centerX + (cropRect.x * pixelSizeX),
      centerY: tfwData.centerY + (cropRect.y * pixelSizeY),
    }
  };
};

// --- Helper Functions for Image Conversion ---

const generateGdalInfo = async (image: any, elevationData: Float32Array | number[], noDataValue: number | null): Promise<string> => {
  let info = '';
  const fileDirectory = image.getFileDirectory();
  const width = image.getWidth();
  const height = image.getHeight();

  info += `Size is ${width}, ${height}\n`;

  if (fileDirectory.GeoKeyDirectory) {
    info += `Coordinate System: Defined by GeoKeys (user selection still recommended for accuracy)\n`;
  } else if (fileDirectory.ModelTransformation) {
    info += `Coordinate System: Defined by ModelTransformation tag\n`;
  }

  const bbox = image.getBoundingBox();
  const pixelSizeX = (bbox[2] - bbox[0]) / width;
  const pixelSizeY = (bbox[1] - bbox[3]) / height; // should be negative

  info += `Origin = (${bbox[0].toFixed(8)}, ${bbox[3].toFixed(8)}) (Upper-Left Corner)\n`;
  info += `Pixel Size = (${pixelSizeX.toFixed(12)}, ${pixelSizeY.toFixed(12)})\n`;

  if (fileDirectory.GDAL_METADATA) {
    info += '\nMetadata:\n';
    const metadata = fileDirectory.GDAL_METADATA;
    const items = metadata.matchAll(/<Item[^>]*name="([^"]+)"[^>]*>([^<]+)<\/Item>/g);
    for (const item of items) {
      info += `  ${item[1]}=${item[2]}\n`;
    }
  }

  info += '\nImage Structure Metadata:\n';
  if (fileDirectory.Compression) {
    const compressionMap: { [key: number]: string } = { 1: 'Uncompressed', 5: 'LZW', 7: 'JPEG', 32773: 'PackBits' };
    info += `  COMPRESSION=${compressionMap[fileDirectory.Compression] || `Code ${fileDirectory.Compression}`}\n`;
  }
  if (fileDirectory.PlanarConfiguration) {
    info += `  INTERLEAVE=${fileDirectory.PlanarConfiguration === 1 ? 'PIXEL' : 'BAND'}\n`;
  }

  info += '\nCorner Coordinates:\n';
  info += `Upper Left  ( ${bbox[0].toFixed(8)}, ${bbox[3].toFixed(8)})\n`;
  info += `Lower Left  ( ${bbox[0].toFixed(8)}, ${bbox[1].toFixed(8)})\n`;
  info += `Upper Right ( ${bbox[2].toFixed(8)}, ${bbox[3].toFixed(8)})\n`;
  info += `Lower Right ( ${bbox[2].toFixed(8)}, ${bbox[1].toFixed(8)})\n`;
  const centerX = (bbox[0] + bbox[2]) / 2;
  const centerY = (bbox[1] + bbox[3]) / 2;
  info += `Center      ( ${centerX.toFixed(8)}, ${centerY.toFixed(8)})\n`;

  const sampleFormat = image.getSampleFormat() || (fileDirectory.SampleFormat && fileDirectory.SampleFormat[0]);
  const bitsPerSample = image.getBitsPerSample();
  let sampleFormatStr = 'Unknown';
  if (sampleFormat === 1) sampleFormatStr = `UInt${bitsPerSample}`;
  else if (sampleFormat === 2) sampleFormatStr = `Int${bitsPerSample}`;
  else if (sampleFormat === 3) sampleFormatStr = `Float${bitsPerSample}`;

  info += `\nBand 1 Type=${sampleFormatStr}\n`;

  let min = Infinity, max = -Infinity, sum = 0, count = 0, sumOfSquares = 0;
  const step = elevationData.length > 1000000 ? Math.floor(elevationData.length / 1000000) : 1;
  for (let i = 0; i < elevationData.length; i+=step) {
    const val = elevationData[i];
    if (isNoData(val, noDataValue)) continue;
    if (val < min) min = val;
    if (val > max) max = val;
    sum += val;
    count++;
  }
  const mean = count > 0 ? sum / count : 0;
  if (count > 0) {
    for (let i = 0; i < elevationData.length; i+=step) {
      const val = elevationData[i];
      if (isNoData(val, noDataValue)) continue;
      sumOfSquares += (val - mean) * (val - mean);
    }
  }
  const stdDev = count > 1 ? Math.sqrt(sumOfSquares / (count - 1)) : 0;

  info += `  Min=${min.toFixed(3)} Max=${max.toFixed(3)}\n`;
  info += `  Minimum=${min.toFixed(3)}, Maximum=${max.toFixed(3)}, Mean=${mean.toFixed(3)}, StdDev=${stdDev.toFixed(3)}\n`;

  if (noDataValue !== null && typeof noDataValue !== 'undefined') {
    info += `  NoData Value=${noDataValue}\n`;
  } else {
    info += '  NoData Value not specified in metadata.\n';
  }

  return info;
};

// Helper to ensure error messages are strings
const getErrorMessage = (err: unknown): string => {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return "An unknown error occurred";
};

const App: React.FC = () => {
  const { t, language, setLanguage } = useTranslation();

  const [tifFile, setTifFile] = useState<File | null>(null);
  const [tfwFile, setTfwFile] = useState<File | null>(null);
  const [lasFile, setLasFile] = useState<File | null>(null);
  const [therionData, setTherionData] = useState<TherionData | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [conversionStatus, setConversionStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [view, setView] = useState<'upload' | 'preview' | 'result'>('upload');
  const [uploadMode, setUploadMode] = useState<'file' | 'auto'>('auto'); // New state for tabs
  const [parsedInfo, setParsedInfo] = useState<ParsedInfo | null>(null);
  const [conversionSourceInfo, setConversionSourceInfo] = useState<ParsedInfo | null>(null);
  const [resampleFactor, setResampleFactor] = useState(1);
  const [coordinateSystem, setCoordinateSystem] = useState('ijtsk');
  const [debugLog, setDebugLog] = useState('');
  const [parsingLog, setParsingLog] = useState('');
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);

  const readFileAs = <T extends 'Text' | 'ArrayBuffer'>(file: File, type: T): Promise<T extends 'Text' ? string : ArrayBuffer> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as any);
      reader.onerror = (err) => reject(new Error(`Error reading file: ${file.name}`));
      if (type === 'Text') reader.readAsText(file);
      else reader.readAsArrayBuffer(file);
    });
  };

  const finalizeParsing = async (image: any, tfwData: TfwData, log: string, filename: string, autoConvert: boolean = false, forcedCoordinateSystem?: string, source: string = 'TIFF', lat?: number, lon?: number) => {
    const width = image.getWidth();
    const height = image.getHeight();
    const rasters = await image.readRasters();
    const elevationData = rasters[0] as (Float32Array | number[]);

    let noDataValue: number | null = null;
    try {
      const gdalNoData = image.getGDALNoData();
      if (gdalNoData !== null && typeof gdalNoData !== 'undefined') {
        noDataValue = typeof gdalNoData === 'string' ? parseFloat(gdalNoData) : gdalNoData;
        log += `GDAL NoData Value found: ${noDataValue}\n`;
      } else {
        log += `GDAL NoData Value not found in TIFF metadata.\n`;
      }
    } catch (e) {
      log += `Could not read GDAL NoData Value from TIFF metadata.\n`;
    }

    log += `--- 3. TIFF METADATA ---\n`;
    log += `Width: ${width} px\n`;
    log += `Height: ${height} px\n`;

    let minElevation = Infinity, maxElevation = -Infinity;
    for (let i = 0; i < elevationData.length; i++) {
      if (isNoData(elevationData[i], noDataValue)) continue;
      if (elevationData[i] < minElevation) minElevation = elevationData[i];
      if (elevationData[i] > maxElevation) maxElevation = elevationData[i];
    }

    log += `Min Elevation: ${minElevation.toFixed(3)} m\n`;
    log += `Max Elevation: ${maxElevation.toFixed(3)} m\n\n`;

    log += `--- 4. ORIGIN CALCULATION for Image ---\n`;
    const { pixelSizeX, pixelSizeY, centerX, centerY } = tfwData;

    // Calculate Top-Left Corner from Center (TFW Standard)
    const upperLeftCornerX = centerX - (pixelSizeX / 2);
    const upperLeftCornerY = centerY - (pixelSizeY / 2); // TFW pixelSizeY is negative for north-up images

    // We strictly store Top-Left as origin for ParsedInfo
    const originX = upperLeftCornerX;
    const originY = upperLeftCornerY;

    log += `[d] Image Top-Left Origin: X: ${originX}, Y: ${originY}\n\n`;

    const gdalInfoText = await generateGdalInfo(image, elevationData, noDataValue);
    setParsingLog(log);

    const info: ParsedInfo = {
      width, height, pixelSizeX: tfwData.pixelSizeX, pixelSizeY: tfwData.pixelSizeY,
      originX, originY, elevationData,
      minElevation, maxElevation, tfwData, filename, noDataValue,
      gdalInfo: gdalInfoText,
      source,
      lat,
      lon
    };

    setParsedInfo(info);
    setResampleFactor(1);
    setDebugLog(log);
    setIsParsing(false);

    if (forcedCoordinateSystem) {
      setCoordinateSystem(forcedCoordinateSystem);
    }

    // Logic for auto-skipping preview
    if (autoConvert) {
      setTimeout(() => {
        startConversion(info, 1, false, forcedCoordinateSystem);
      }, 100);
    } else {
      setView('preview');
    }
  };

  const parseLasFile = async (file: File) => {
    setIsParsing(true);
    setError(null);
    setFileError(null);
    setParsedInfo(null);
    setTherionData(null);

    try {
      const { LASReader } = await import('las-js');
      const arrayBuffer = await readFileAs(file, 'ArrayBuffer');
      const reader = new LASReader(arrayBuffer);
      const points = reader.readPoints();
      
      if (points.length === 0) throw new Error("No points found in LAS file.");

      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
      for (const p of points) {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
        if (p.z < minZ) minZ = p.z;
        if (p.z > maxZ) maxZ = p.z;
      }

      // Define grid resolution (e.g., 1 meter)
      const resolution = 1;
      const width = Math.ceil((maxX - minX) / resolution);
      const height = Math.ceil((maxY - minY) / resolution);
      const elevationData = new Float32Array(width * height).fill(-9999); // Use a nodata value

      for (const p of points) {
        const x = Math.floor((p.x - minX) / resolution);
        const y = Math.floor((p.y - minY) / resolution);
        if (x >= 0 && x < width && y >= 0 && y < height) {
          const idx = (height - 1 - y) * width + x; // Flip Y for top-down
          if (p.z > elevationData[idx]) elevationData[idx] = p.z;
        }
      }

      const tfwData: TfwData = {
        pixelSizeX: resolution,
        rotationY: 0,
        rotationX: 0,
        pixelSizeY: -resolution,
        centerX: minX + (width * resolution) / 2,
        centerY: minY + (height * resolution) / 2,
      };

      const info: ParsedInfo = {
        width, height, pixelSizeX: resolution, pixelSizeY: -resolution,
        originX: minX, originY: maxY, elevationData,
        minElevation: minZ, maxElevation: maxZ, tfwData, filename: file.name.replace(/\.(las|laz)$/i, ''), noDataValue: -9999,
        gdalInfo: "LAS file processed as grid",
        source: 'LAS'
      };

      setParsedInfo(info);
      setResampleFactor(1);
      setDebugLog("LAS file processed.");
      setIsParsing(false);
      setView('preview');
      
    } catch (err: unknown) {
      console.error(err);
      setError(getErrorMessage(err));
      setIsParsing(false);
    }
  };

  const parseWithTiffData = async (image: any) => {
    let log = `--- GeoTIFF to Therion Conversion Log ---\nTimestamp: ${new Date().toISOString()}\n\n`;
    log += `--- 1. INPUT FILE ---\nTIFF File: ${tifFile!.name}\n\n`;
    log += `--- 2. GEOREFERENCING SOURCE ---\nSource: Embedded in TIFF metadata\n\n`;

    const width = image.getWidth();
    const height = image.getHeight();
    const [minX, _minY, maxX, maxY] = image.getBoundingBox();
    const pixelSizeX = (maxX - minX) / width;
    const pixelSizeY = -(maxY - _minY) / height;

    const tfwData: TfwData = {
      pixelSizeX, rotationY: 0, rotationX: 0, pixelSizeY,
      centerX: minX + (pixelSizeX / 2),
      centerY: maxY + (pixelSizeY / 2),
    };

    await finalizeParsing(image, tfwData, log, tifFile!.name.replace(/\.(tif|tiff)$/i, ''), false, undefined, 'TIFF');
  };

  const parseWithTfwData = async (image: any, currentTfwFile: File) => {
    let log = `--- GeoTIFF to Therion Conversion Log ---\nTimestamp: ${new Date().toISOString()}\n\n`;
    log += `--- 1. INPUT FILES ---\nTIFF File: ${tifFile!.name}\nTFW File: ${currentTfwFile.name}\n\n`;
    log += `--- 2. GEOREFERENCING SOURCE ---\nSource: .tfw file\n\n`;

    const tfwContent = await readFileAs(currentTfwFile, 'Text');
    const lines = tfwContent.trim().split(/\r?\n/);
    if (lines.length < 6) throw new Error("Invalid .tfw file: must contain 6 lines.");

    const [A, D, B, E, C, F] = lines.map(parseFloat);
    const tfwData: TfwData = { pixelSizeX: A, rotationY: D, rotationX: B, pixelSizeY: E, centerX: C, centerY: F };
    await finalizeParsing(image, tfwData, log, tifFile!.name.replace(/\.(tif|tiff)$/i, ''), false, undefined, 'TIFF');
  };

  // --- Auto Download Parsing Flow ---
  const processAutoDownloadedData = async (buffer: ArrayBuffer, filename: string, source: string, lat: number, lon: number) => {
    setIsParsing(true);
    setError(null);
    setTherionData(null);

    try {
      const GeoTIFF = await loadGeoTIFF();
      const tiff = await GeoTIFF.fromArrayBuffer(buffer);
      const image = await tiff.getImage();

      // Auto-downloaded files from OpenTopography usually have embedded Geotags
      let log = `--- Auto-Download Log ---\nTimestamp: ${new Date().toISOString()}\n\n`;
      log += `--- 1. SOURCE ---\nAPI: ${source}\nFilename: ${filename}\nLat: ${lat}, Lon: ${lon}\n\n`;

      const width = image.getWidth();
      const height = image.getHeight();
      const bbox = image.getBoundingBox();
      if (!bbox) throw new Error("Downloaded GeoTIFF is missing embedded georeferencing.");

      const [minX, _minY, maxX, maxY] = bbox;
      const pixelSizeX = (maxX - minX) / width;
      const pixelSizeY = -(maxY - _minY) / height;

      const tfwData: TfwData = {
        pixelSizeX, rotationY: 0, rotationX: 0, pixelSizeY,
        centerX: minX + (pixelSizeX / 2),
        centerY: maxY + (pixelSizeY / 2),
      };

      // Pass autoConvert = true AND force 'utm34n' as default for automatic download
      // This will trigger the WGS84 -> UTM projection logic in startConversion
      await finalizeParsing(image, tfwData, log, filename, true, 'utm34n', source, lat, lon);

    } catch (err: unknown) {
      console.error(err);
      setError(getErrorMessage(err));
      setIsParsing(false);
    }
  };

  useEffect(() => {
    const checkAndParseFiles = async () => {
      if (lasFile) {
        await parseLasFile(lasFile);
        return;
      }

      if (!tifFile) {
        setFileError(null);
        return;
      }

      if (tfwFile) {
        const tifBase = tifFile.name.replace(/\.(tiff?)$/i, '');
        const tfwBase = tfwFile.name.replace(/\.tfw$/i, '');
        if (tifBase !== tfwBase) {
          setFileError(t('error_mismatched_names'));
          return;
        }
      }

      setIsParsing(true);
      setError(null);
      setFileError(null);
      setParsedInfo(null);
      setTherionData(null);

      try {
        const GeoTIFF = await loadGeoTIFF();
        const tifBuffer = await readFileAs(tifFile, 'ArrayBuffer');
        const tiff = await GeoTIFF.fromArrayBuffer(tifBuffer);
        const image = await tiff.getImage();

        const boundingBox = image.getBoundingBox();
        if (boundingBox && boundingBox.length === 4) {
          await parseWithTiffData(image);
        } else if (tfwFile) {
          await parseWithTfwData(image, tfwFile);
        } else {
          setIsParsing(false);
          setFileError(t('error_tfw_required'));
        }
      } catch (err: unknown) {
        console.error(err);
        setError(getErrorMessage(err));
        handleReset();
      }
    };

    checkAndParseFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tifFile, tfwFile, lasFile]);

  const startConversion = useCallback(async (dataToConvert: ParsedInfo, factorValue: number, isCropped: boolean = false, forcedCoordinateSystem?: string) => {
    setConversionSourceInfo(dataToConvert);
    setIsConverting(true);
    setError(null);
    setTherionData(null);

    let log = isCropped ? '' : parsingLog;
    if (isCropped) {
      log = `--- GeoTIFF to Therion Conversion Log ---\nTimestamp: ${new Date().toISOString()}\n\n`;
      log += `--- NOTE: CONVERTING CROPPED OR ADJUSTED AREA ---\n\n`;
    }

    // Use the forced CS if provided (e.g. from auto download), otherwise use state
    const activeCoordinateSystem = forcedCoordinateSystem || coordinateSystem;

    try {
      const { elevationData, width, height, pixelSizeX, pixelSizeY, originX, originY, filename } = dataToConvert;
      const factor = Math.max(1, Math.floor(factorValue));

      log += `--- 5. CONVERSION SETTINGS ---\n`;
      log += `Coordinate System: ${activeCoordinateSystem}\nResample Factor: ${factor}\n`;
      log += `  - Original Dimensions: ${width} x ${height}\n`;

      // Use `let` so these can be updated if we do metric resampling
      let newWidth = Math.floor(width / factor);
      let newHeight = Math.floor(height / factor);
      let newElevationData = new Float32Array(newWidth * newHeight);
      let newPixelSizeX = pixelSizeX * factor;
      let newPixelSizeY = pixelSizeY * factor;

      // Initial simple decimation (fallback)
      for (let y = 0; y < newHeight; y++) {
        for (let x = 0; x < newWidth; x++) {
          const oldY = y * factor;
          const oldX = x * factor;
          newElevationData[y * newWidth + x] = elevationData[oldY * width + oldX];
        }
      }

      let thOriginX = originX;
      let thOriginY = originY; // Currently Top-Left

      const isInputWGS84 = Math.abs(pixelSizeX) < 0.1; // Heuristic
      const targetIsUTM = activeCoordinateSystem.startsWith('utm');

      // --- WGS84 -> UTM Projection & Metric Resampling Logic ---
      if (isInputWGS84 && targetIsUTM) {
        try {
          const proj4 = await loadProj4();

          // Define zones. WGS84 is 'EPSG:4326'
          const destProj = activeCoordinateSystem === 'utm33n' ? '+proj=utm +zone=33 +datum=WGS84 +units=m +no_defs' : '+proj=utm +zone=34 +datum=WGS84 +units=m +no_defs';
          const sourceProj = 'EPSG:4326';

          // originX, originY are Top-Left
          const wgs84_Top = originY;
          const wgs84_Left = originX;
          const wgs84_Bottom = originY + height * pixelSizeY; // pixelSizeY is negative
          const wgs84_Right = originX + width * pixelSizeX;

          // Project Corners to get metric bounds
          const pTL = proj4(sourceProj, destProj, [wgs84_Left, wgs84_Top]);
          const pBR = proj4(sourceProj, destProj, [wgs84_Right, wgs84_Bottom]);
          const pTR = proj4(sourceProj, destProj, [wgs84_Right, wgs84_Top]);
          const pBL = proj4(sourceProj, destProj, [wgs84_Left, wgs84_Bottom]);

          // Calculate Bounding Box
          const minX = Math.min(pTL[0], pBL[0]);
          const maxX = Math.max(pTR[0], pBR[0]);
          const minY = Math.min(pBL[1], pBR[1]);
          const maxY = Math.max(pTL[1], pTR[1]);

          const widthMeters = maxX - minX;
          const heightMeters = maxY - minY;

          // Calculate Square Metric Pixel Size
          // We base this on the source resolution in latitude (roughly constant)
          const metersPerDegLat = 111320;
          const sourceResMeters = Math.abs(pixelSizeY) * metersPerDegLat;
          const targetResMeters = sourceResMeters * factor; // Apply user factor

          // Calculate New Grid Dimensions
          const resampledWidth = Math.round(widthMeters / targetResMeters);
          const resampledHeight = Math.round(heightMeters / targetResMeters);

          log += `  - Auto-Projected WGS84 to ${activeCoordinateSystem.toUpperCase()}\n`;
          log += `  - Resampling to Square Metric Grid: ${resampledWidth}x${resampledHeight} (Pixel size: ~${targetResMeters.toFixed(2)}m)\n`;

          const resampledData = new Float32Array(resampledWidth * resampledHeight);

          // Resample Loop
          for (let r = 0; r < resampledHeight; r++) {
            // Pixel center Y in UTM (Starts at Top, goes down)
            const utmY = maxY - (r * targetResMeters);
            for (let c = 0; c < resampledWidth; c++) {
              // Pixel center X in UTM (Starts at Left, goes right)
              const utmX = minX + (c * targetResMeters);

              // Inverse Project to WGS84
              const wgsPt = proj4(destProj, sourceProj, [utmX, utmY]); // [lon, lat]

              // Map WGS84 point to Source Grid Coordinates (float index)
              const srcX = (wgsPt[0] - originX) / pixelSizeX;
              const srcY = (wgsPt[1] - originY) / pixelSizeY;

              resampledData[r * resampledWidth + c] = interpolateElevation(
                elevationData, width, height, srcX, srcY, dataToConvert.noDataValue
              );
            }
          }

          // Update main variables with resampled data
          newElevationData = resampledData;
          newWidth = resampledWidth;
          newHeight = resampledHeight;

          // Set Metric Pixel Sizes (Square)
          newPixelSizeX = targetResMeters;
          newPixelSizeY = -targetResMeters; // Negative because Y axis is top-down in grid/image

          // Set Internal Origin to Top-Left (for DXF and Image generation)
          thOriginX = minX;
          thOriginY = maxY;
          log += `  - Metric Grid Origin (TL): ${thOriginX.toFixed(2)}, ${thOriginY.toFixed(2)}\n`;

        } catch (e) {
          console.error("Projection failed", e);
          log += `WARNING: Projection to UTM failed. Output may be incorrect.\n`;
        }
      } else if (activeCoordinateSystem === 'jtsk') {
        // Standard JTSK adjustment (if needed based on logic)
        thOriginY = -(originY + (newHeight * newPixelSizeY));
      }

      log += `  - New Dimensions: ${newWidth} x ${newHeight}\n`;

      const chunks: string[] = [];
      let txtPreview = "";
      const PREVIEW_LINES = 20;

      // -------------------------------------------------------------
      // THERION DATA GENERATION (TOP-DOWN)
      // We write data from North (Row 0) to South (Row Height-1).
      // We use 'grid-flip vertical' in the .th file so Therion 
      // knows to fill the grid from Top to Bottom.
      // -------------------------------------------------------------
      for (let y = 0; y < newHeight; y++) {
        let rowStr = "";
        for (let x = 0; x < newWidth; x++) {
             rowStr += newElevationData[y * newWidth + x].toFixed(3) + (x < newWidth - 1 ? " " : "");
        }
        chunks.push(rowStr + "\n");
        if (y < PREVIEW_LINES) txtPreview += rowStr + "\n";
      }
      if (newHeight > PREVIEW_LINES) txtPreview += "...";

      const txtBlob = new Blob(chunks, { type: 'text/plain;charset=utf-8' });
      log += `  - Text data generated (${(txtBlob.size / (1024 * 1024)).toFixed(2)} MB)\n`;
      log += `  - Original Resolution: ${pixelSizeX.toFixed(8)} x ${Math.abs(pixelSizeY).toFixed(8)}\n`;
      log += `  - New Resolution: ${newPixelSizeX.toFixed(8)} x ${Math.abs(newPixelSizeY).toFixed(8)}\n\n`;

      // Calculate Resolution in Meters for Hillshade Generation
      let resMetersX = newPixelSizeX;
      let resMetersY = Math.abs(newPixelSizeY);

      if ((activeCoordinateSystem === 'wgs84' || activeCoordinateSystem === 'lat-long') && !targetIsUTM) {
        const METERS_PER_DEG_LAT = 111320;
        const centerLatDeg = (originY - (height * Math.abs(pixelSizeY) / 2));
        const centerLatRad = centerLatDeg * (Math.PI / 180);
        const metersPerDegLon = METERS_PER_DEG_LAT * Math.cos(centerLatRad);
        resMetersY = Math.abs(newPixelSizeY) * METERS_PER_DEG_LAT;
        resMetersX = newPixelSizeX * metersPerDegLon;
        log += `  - Calculated Resolution (Meters): ${resMetersX.toFixed(2)}m x ${resMetersY.toFixed(2)}m (at Lat ${centerLatDeg.toFixed(2)})\n`;
      }

      log += `--- 6. GENERATING IMAGES ---\n`;

      const generatedImages: GeneratedImage[] = [];
      const MAX_CANVAS_DIMENSION = 16384;
      const MAX_CANVAS_AREA = 16384 * 16384;

      if (newWidth > MAX_CANVAS_DIMENSION || newHeight > MAX_CANVAS_DIMENSION || (newWidth * newHeight) > MAX_CANVAS_AREA) {
        log += `WARNING: Image dimensions (${newWidth}x${newHeight}) exceed browser canvas limits. Image generation skipped.\n`;
        setConversionStatus(t('errorPrefix') + ' Image too large to preview');
      } else {
        try {
          // Use standard Top-Down data for image generation to ensure correct orientation.
          // Removed manual vertical flip which caused the bitmap to be upside-down.
          
          setConversionStatus(t('result_generating_classic'));
          const classicBlob = await generateHillshadeBlob(newWidth, newHeight, newElevationData, resMetersX, resMetersY, {
            contrast: 200, brightness: 55, filter: 'blur(0.3px) contrast(105%) brightness(102%)'
          });
          generatedImages.push({ name: 'Classic', blob: classicBlob });

          setConversionStatus(t('result_generating_contrast'));
          const contrastBlob = await generateHillshadeBlob(newWidth, newHeight, newElevationData, resMetersX, resMetersY, {
            contrast: 255, brightness: 0, filter: 'blur(0.2px) contrast(110%)'
          });
          generatedImages.push({ name: 'High Contrast', blob: contrastBlob });

        } catch (imgErr: any) {
          console.error("Image generation failed:", imgErr);
          log += `WARNING: Image generation failed: ${imgErr.message}\n`;
        }
      }

      let thPixelSizeX = newPixelSizeX;
      let thPixelSizeY = newPixelSizeY; // Maintain sign from projection (negative for top-down)

      let bitmapCoordinateSystem: string | undefined = undefined;
      let bitmapCalibration = "";

      // -------------------------------------------------------------
      // CALIBRATION LOGIC
      // -------------------------------------------------------------
      const worldLeft = thOriginX;
      // thPixelSizeX is positive
      const worldRight = thOriginX + (newWidth * thPixelSizeX);

      // Determine Top and Bottom based on Y step direction.
      // Typically for GeoTIFF/UTM projection, thOriginY is Top, and step is negative.
      let worldTop: number;
      let worldBottom: number;

      if (thPixelSizeY < 0) {
        worldTop = thOriginY;
        worldBottom = thOriginY + (newHeight * thPixelSizeY); // Subtracts height from top
      } else {
        worldBottom = thOriginY;
        worldTop = thOriginY + (newHeight * thPixelSizeY);
      }

      // Therion Grid Definition:
      // grid [X-BottomLeft] [Y-BottomLeft] [StepX] [StepY] [NX] [NY]
      // We strictly use Positive Steps for the grid definition.
      // We add 'grid-flip vertical' because our text data is Top-Down.
      let thGridLine = `#grid-flip vertical #odkomentovat ak je povrch zrkadlovy\n  grid ${worldLeft.toFixed(8)} ${worldBottom.toFixed(8)} ${Math.abs(thPixelSizeX).toFixed(12)} ${Math.abs(thPixelSizeY).toFixed(12)} ${newWidth} ${newHeight}`;

      // Default Bitmap Calibration uses the Metric/Grid coordinates...
      if (!bitmapCoordinateSystem) {
        // If we are in pure WGS84 mode (not projected to UTM)
        if (activeCoordinateSystem === 'wgs84' || activeCoordinateSystem === 'lat-long') {
          // Use Lat/Lon swapping for Grid
          // grid lat lon resLat resLon width height
          thGridLine = `grid ${originY.toFixed(8)} ${originX.toFixed(8)} ${Math.abs(newPixelSizeY).toFixed(12)} ${newPixelSizeX.toFixed(12)} ${newWidth} ${newHeight}`;

          // Recalculate limits for calibration based on degrees
          const wgsLL_Lat = originY;
          const wgsLL_Lon = originX;
          const wgsUR_Lat = originY + (height * Math.abs(pixelSizeY));
          const wgsUR_Lon = originX + (width * pixelSizeX);

          // [0 0 LatLL LonLL W H LatUR LonUR]
          bitmapCalibration = `[0 0 ${wgsLL_Lat.toFixed(8)} ${wgsLL_Lon.toFixed(8)} ${newWidth} ${newHeight} ${wgsUR_Lat.toFixed(8)} ${wgsUR_Lon.toFixed(8)}]`;
        } else {
          // Standard metric calibration (UTM, JTSK, etc.)
          // Therion Bitmap Format: [PixelX1 PixelY1 MapX1 MapY1 PixelX2 PixelY2 MapX2 MapY2]
          // Note: Therion's Pixel Y axis for calibration goes UP from bottom (Cartesian).
          // Standard Image Y axis goes DOWN from top.
          // Point 1: Top-Left of Image (Standard: 0, 0)
          //          Therion Pixel Y = Image Height (Top of image space)
          //          Map Coordinate = World Top-Left
          // Point 2: Bottom-Right of Image (Standard: W, H)
          //          Therion Pixel Y = 0 (Bottom of image space)
          //          Map Coordinate = World Bottom-Right

          bitmapCalibration = `[0 ${newHeight} ${worldLeft.toFixed(8)} ${worldTop.toFixed(8)} ${newWidth} 0 ${worldRight.toFixed(8)} ${worldBottom.toFixed(8)}]`;
        }
      }

      log += `--- 7. FINAL OUTPUT DATA ---\nGenerated .th \`grid\` line:\n${thGridLine}\n`;
      log += `Generated .th \`bitmap\` calibration data:\n${bitmapCalibration}\n`;

      setDebugLog(log);

      // Map internal IDs to Therion standard CS names
      let finalCoordinateSystem = activeCoordinateSystem;
      if (activeCoordinateSystem === 'wgs84') finalCoordinateSystem = 'lat-long';
      if (activeCoordinateSystem === 'utm33n') finalCoordinateSystem = 'UTM33';
      if (activeCoordinateSystem === 'utm34n') finalCoordinateSystem = 'UTM34';

      setTherionData({
        txtFile: txtBlob,
        txtPreview: txtPreview,
        baseFilename: filename,
        width: newWidth, height: newHeight,
        debugLog: log,
        generatedImages,
        elevationData: newElevationData,
        coordinateSystem: finalCoordinateSystem,
        bitmapCoordinateSystem,
        thGridLine,
        bitmapCalibration,
        minElevation: dataToConvert.minElevation,
        maxElevation: dataToConvert.maxElevation,
        resampleFactor: factor,
        // Use the calculated Metric/Grid coordinates for DXF/STL
        dxOriginX: thOriginX,
        dxOriginY: worldTop, // Ensure DXF generator gets the Top Y coordinate (array starts at top)
        dxPixelSizeX: thPixelSizeX,
        dxPixelSizeY: thPixelSizeY, // DXF generator expects negative Y step (array walks down)
      });

      setView('result');

    } catch (err: unknown) {
      console.error(err);
      setError(getErrorMessage(err));
    } finally {
      setIsConverting(false);
      setConversionStatus('');
    }
  }, [coordinateSystem, parsingLog, t]);

  const handleFullConvert = useCallback(() => {
    if (parsedInfo) {
      startConversion(parsedInfo, resampleFactor, false);
    }
  }, [parsedInfo, startConversion, resampleFactor]);

  const handleCropAndConvert = useCallback((cropRect: { x: number; y: number; width: number; height: number; }) => {
    if (!parsedInfo) return;
    setIsCropModalOpen(false);
    const croppedInfo = createCroppedInfo(parsedInfo, cropRect);
    croppedInfo.filename = `${parsedInfo.filename}_cropped`;
    startConversion(croppedInfo, resampleFactor, true);
  }, [parsedInfo, startConversion, resampleFactor]);

  const handleRegenerate = useCallback(async (newFactor: number, newSource: string) => {
    if (conversionSourceInfo) {
      const wasCropped = conversionSourceInfo.filename.endsWith('_cropped') || conversionSourceInfo.filename.endsWith('_adjusted');
      
      if (newSource !== conversionSourceInfo.source) {
          // TODO: Implement source switching logic
          console.warn("Source switching not yet fully implemented. Regenerating with original source.");
      }
      
      await startConversion(conversionSourceInfo, newFactor, wasCropped);
    }
  }, [conversionSourceInfo, startConversion]);

  const handleReset = useCallback(() => {
    setTifFile(null);
    setTfwFile(null);
    setTherionData(null);
    setError(null);
    setFileError(null);
    setIsParsing(false);
    setIsConverting(false);
    setConversionStatus('');
    setView('upload');
    setParsedInfo(null);
    setConversionSourceInfo(null);
    setCoordinateSystem('ijtsk');
    setDebugLog('');
    setParsingLog('');
  }, []);

  const handleFilesChange = (newFiles: { tif?: File, tfw?: File, las?: File }) => {
    if (!newFiles) return; // Guard against undefined to prevent TypeError
    if (newFiles.tif) setTifFile(newFiles.tif);
    if (newFiles.tfw) setTfwFile(newFiles.tfw);
    if (newFiles.las) setLasFile(newFiles.las);
    setError(null);
    setFileError(null);
  };

  const toggleLanguage = () => setLanguage(language === 'sk' ? 'en' : 'sk');

  const renderContent = () => {
    if (view === 'upload' && isParsing) {
      return (
        <div className="text-center p-12 backdrop-blur-sm bg-slate-900/30 rounded-2xl border border-slate-700/50">
          <LoadingSpinner size="large" />
          <p className="mt-6 text-slate-300 text-xl">{t('parsing')}</p>
        </div>
      );
    }

    switch(view) {
      case 'upload':
        return (
          <>
            <div className="flex justify-center gap-4 mb-8">
              <button
                onClick={() => setUploadMode('file')}
                className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all ${uploadMode === 'file' ? 'bg-teal-500 text-white shadow-lg' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
              >
                <UploadIcon />
                {t('tab_upload')}
              </button>
              <button
                onClick={() => setUploadMode('auto')}
                className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all ${uploadMode === 'auto' ? 'bg-teal-500 text-white shadow-lg' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
              >
                <SatelliteIcon />
                {t('tab_auto')}
              </button>
            </div>

            {uploadMode === 'file' ? (
              <FileInput
                onFilesChange={handleFilesChange}
                files={{ tif: tifFile, tfw: tfwFile, las: lasFile }}
                fileError={fileError}
                isParsing={isParsing}
              />
            ) : (
              <AutoDownload
                onDownloadSuccess={processAutoDownloadedData}
                onError={(msg) => setError(msg)}
                isProcessing={isParsing || isConverting}
              />
            )}
          </>
        );

      case 'preview':
        if (parsedInfo) {
          return <PreviewAndSettings
            info={parsedInfo}
            resampleFactor={resampleFactor}
            onFactorChange={setResampleFactor}
            coordinateSystem={coordinateSystem}
            onCoordinateSystemChange={setCoordinateSystem}
            onConvert={handleFullConvert}
            isConverting={isConverting}
            conversionStatus={conversionStatus}
            onCrop={() => setIsCropModalOpen(true)}
          />
        }
        return null;

      case 'result':
        if (therionData && conversionSourceInfo) {
          return <ResultDisplay
            data={therionData}
            sourceInfo={conversionSourceInfo}
            onReset={handleReset}
            onRegenerate={handleRegenerate}
            isConverting={isConverting}
          />
        }
        return null;

      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white font-sans">
      <div className="container mx-auto px-4 py-12 max-w-7xl">
        <header className="flex flex-col md:flex-row items-center md:items-start gap-8 mb-10 text-center md:text-left">
          <div className="flex-shrink-0">
              <LlamaHillsIcon className="w-44 h-44 text-teal-400" />
          </div>
          <div className="flex flex-col justify-center pt-2">
             <div onClick={() => window.location.reload()} className="cursor-pointer hover:opacity-90 transition-opacity" title={t('newConversionButton')}>
                <h1 className="text-5xl sm:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-500 mb-3 leading-tight">
                   {t('appTitle')}
                </h1>
             </div>
             <p className="text-lg text-gray-400 max-w-2xl leading-relaxed">{t('appDescription')}</p>
          </div>
        </header>

        {error && (
          <div className="mb-8 p-6 bg-red-900/20 backdrop-blur-sm border border-red-500/50 rounded-xl">
            <p className="text-red-300 text-center font-medium">{t('errorPrefix')} {error}</p>
          </div>
        )}

        {renderContent()}

        {parsedInfo && isCropModalOpen && <CropModal
          isOpen={isCropModalOpen}
          onClose={() => setIsCropModalOpen(false)}
          onConvert={handleCropAndConvert}
          info={parsedInfo}
        />}
      </div>

      {view === 'upload' && uploadMode === 'file' && !isParsing && <Instructions />}
      
      <footer className="text-center mt-8 text-gray-500 text-sm">
          <p>{t('footerText')}</p>
          <button onClick={toggleLanguage} className="mt-2 text-teal-400 hover:text-teal-300 underline">
            {language === 'sk' ? t('switchToEN') : t('switchToSK')}
          </button>
      </footer>
    </div>
  );
};

export default App;