

export interface GeneratedImage {
    name: string; // e.g., "Classic", "Color Relief"
    blob: Blob;
}

export interface TherionData {
  txtFile: Blob;
  txtPreview: string;
  baseFilename: string;
  width: number;
  height: number;
  debugLog: string;
  generatedImages: GeneratedImage[];
  // Data needed for regeneration and .th file construction
  elevationData: Float32Array | number[];
  coordinateSystem: string;
  bitmapCoordinateSystem?: string; // Optional: allows bitmap to have different CS than grid
  thGridLine: string; 
  bitmapCalibration: string; // The part in brackets: "[0 0 ...]"
  minElevation: number;
  maxElevation: number;
  resampleFactor: number;
  // Data needed for DXF export
  dxOriginX: number;
  dxOriginY: number;
  dxPixelSizeX: number;
  dxPixelSizeY: number;
}


export interface TfwData {
  pixelSizeX: number; // A
  rotationY: number;  // D
  rotationX: number;  // B
  pixelSizeY: number; // E (negative)
  centerX: number;    // C
  centerY: number;    // F
}

export interface ParsedInfo {
  width: number;
  height: number;
  pixelSizeX: number;
  pixelSizeY: number;
  originX: number;
  originY: number;
  elevationData: Float32Array | number[];
  minElevation: number;
  maxElevation: number;
  tfwData: TfwData;
  filename: string;
  noDataValue?: number | null;
  gdalInfo?: string;
  source?: string;
  lat?: number;
  lon?: number;
}