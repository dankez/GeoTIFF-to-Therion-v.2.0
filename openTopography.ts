
// Constants for Earth's geometry
const EARTH_RADIUS_METERS = 6378137;
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

export interface GeoBounds {
    north: number;
    south: number;
    east: number;
    west: number;
}

/**
 * Calculates a Bounding Box (WGS84) given a center point and distances in meters.
 * Uses a spherical approximation which is sufficient for small to medium scale terrain downloads.
 */
export const calculateBoundingBox = (
    lat: number,
    lon: number,
    northMeters: number,
    southMeters: number,
    eastMeters: number,
    westMeters: number
): GeoBounds => {
    // Latitude calculation (1 deg lat is approx constant ~111km)
    const dLatNorth = northMeters / 111320;
    const dLatSouth = southMeters / 111320;

    const north = lat + dLatNorth;
    const south = lat - dLatSouth;

    // Longitude calculation (depends on latitude)
    // 1 deg lon = 111320 * cos(lat)
    // We use the center latitude for the scaling factor
    const metersPerDegLon = 111320 * Math.cos(lat * DEG_TO_RAD);
    
    const dLonEast = eastMeters / metersPerDegLon;
    const dLonWest = westMeters / metersPerDegLon;

    const east = lon + dLonEast;
    const west = lon - dLonWest;

    return { north, south, east, west };
};

/**
 * Fetches the GeoTIFF from OpenTopography API.
 * Datasets: 
 * - ALOS World 3D - 30m (AW3D30)
 * - Continental Europe DTM - 30m (EU_DTM)
 */
export const fetchElevationData = async (
    bounds: GeoBounds,
    apiKey: string,
    dataset: string = 'AW3D30'
): Promise<ArrayBuffer> => {
    const baseUrl = 'https://portal.opentopography.org/API/globaldem';
    
    const params = new URLSearchParams({
        demtype: dataset, 
        south: bounds.south.toString(),
        north: bounds.north.toString(),
        west: bounds.west.toString(),
        east: bounds.east.toString(),
        outputFormat: 'GTiff',
        API_Key: apiKey
    });

    const url = `${baseUrl}?${params.toString()}`;

    const response = await fetch(url);

    if (!response.ok) {
        // Try to read the error message from the body if possible
        const text = await response.text();
        
        // Attempt to parse XML error format often returned by OpenTopography
        // Example: <error>Error: API maximum rate limit reached. (100 API calls/24hrs)</error>
        const xmlMatch = text.match(/<error>(.*?)<\/error>/);
        if (xmlMatch && xmlMatch[1]) {
            throw new Error(`OpenTopography: ${xmlMatch[1]}`);
        }

        throw new Error(`OpenTopography API Error (${response.status}): ${text.substring(0, 200)}...`);
    }

    // Check content type to ensure we didn't get an HTML error page with status 200
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('text/html')) {
         const text = await response.text();
         if (text.includes('Invalid API Key')) {
             throw new Error('Invalid OpenTopography API Key.');
         }
         throw new Error('Received HTML response instead of TIFF. Possibly an API error or limit reached.');
    }

    return await response.arrayBuffer();
};
