import { calculateBoundingBox } from './openTopography';

export const fetchOpenTopography = async (lat: number, lon: number, dims: any, apiKey: string) => {
    const bounds = calculateBoundingBox(lat, lon, dims.top, dims.bottom, dims.right, dims.left);
    // Assuming fetchElevationData is imported from openTopography.ts
    const { fetchElevationData } = await import('./openTopography');
    return await fetchElevationData(bounds, apiKey, 'AW3D30');
};

export const fetchCuzkDmr5g = async (lat: number, lon: number, dims: any) => {
    // 1. Calculate Bounding Box (in WGS84)
    const bounds = calculateBoundingBox(lat, lon, dims.top, dims.bottom, dims.right, dims.left);
    // bounds: { north, south, east, west }
    
    // 2. Construct ArcGIS exportImage URL
    // bbox: minLon, minLat, maxLon, maxLat
    const bbox = `${bounds.west},${bounds.south},${bounds.east},${bounds.north}`;
    
    // 3. Define image size (e.g., based on dims, maybe 1000x1000 for now)
    const size = `1000,1000`;
    
    // 4. Construct URL
    const baseUrl = 'https://ags.cuzk.gov.cz/arcgis2/rest/services/dmr5g/ImageServer/exportImage';
    const url = `${baseUrl}?bbox=${bbox}&bboxSR=4326&imageSR=4326&size=${size}&format=tiff&f=image`;
    
    // 5. Fetch
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`ČÚZK API failed: ${response.statusText} (URL: ${url})`);
    }
    
    return await response.arrayBuffer();
};

export const fetchCuzkDmpOk = async (lat: number, lon: number, dims: any) => {
    // 1. Calculate Bounding Box (in WGS84)
    const bounds = calculateBoundingBox(lat, lon, dims.top, dims.bottom, dims.right, dims.left);
    
    // 2. Construct ArcGIS exportImage URL
    const bbox = `${bounds.west},${bounds.south},${bounds.east},${bounds.north}`;
    
    // 3. Define image size
    const size = `1000,1000`;
    
    // 4. Construct URL
    const baseUrl = 'https://ags.cuzk.gov.cz/arcgis2/rest/services/dmp_obrazova_korelace/ImageServer/exportImage';
    const url = `${baseUrl}?bbox=${bbox}&bboxSR=4326&imageSR=4326&size=${size}&format=tiff&f=image`;
    
    // 5. Fetch
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`ČÚZK DMP OK API failed: ${response.statusText} (URL: ${url})`);
    }
    
    return await response.arrayBuffer();
};

export const isLocationInCzechia = (lat: number, lon: number): boolean => {
    return lat >= 48.5 && lat <= 51.1 && lon >= 12.1 && lon <= 18.9;
};
