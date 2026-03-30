

export const generateDxfContent = (
    elevationData: Float32Array | number[],
    width: number,
    height: number,
    originX: number, // Left X
    originY: number, // Top Y
    pixelSizeX: number,
    pixelSizeY: number // usually negative
): string => {
    let dxf = "0\nSECTION\n2\nENTITIES\n";
    
    // Helper to check for valid elevation (simple check for NoData)
    const isValid = (val: number) => {
        return isFinite(val) && Math.abs(val) < 3e38;
    };

    // Loop through grid cells to create 3DFACEs
    // We create a face for each quad formed by (x,y), (x+1,y), (x+1,y+1), (x,y+1)
    for (let y = 0; y < height - 1; y++) {
        for (let x = 0; x < width - 1; x++) {
            // Indices in the elevation array
            const i1 = y * width + x;           // Top-Left
            const i2 = y * width + (x + 1);     // Top-Right
            const i3 = (y + 1) * width + (x + 1); // Bottom-Right
            const i4 = (y + 1) * width + x;     // Bottom-Left
            
            const z1 = elevationData[i1];
            const z2 = elevationData[i2];
            const z3 = elevationData[i3];
            const z4 = elevationData[i4];
            
            // If any vertex is invalid (NoData), skip this face
            if (!isValid(z1) || !isValid(z2) || !isValid(z3) || !isValid(z4)) continue;

            // Calculate real-world coordinates for vertices
            const x1 = originX + x * pixelSizeX;
            const y1 = originY + y * pixelSizeY;
            
            const x2 = originX + (x + 1) * pixelSizeX;
            const y2 = originY + y * pixelSizeY;
            
            const x3 = originX + (x + 1) * pixelSizeX;
            const y3 = originY + (y + 1) * pixelSizeY;
            
            const x4 = originX + x * pixelSizeX;
            const y4 = originY + (y + 1) * pixelSizeY;
            
            dxf += "0\n3DFACE\n8\nTerrain\n"; // Layer name "Terrain"
            dxf += `10\n${x1.toFixed(4)}\n20\n${y1.toFixed(4)}\n30\n${z1.toFixed(4)}\n`;
            dxf += `11\n${x2.toFixed(4)}\n21\n${y2.toFixed(4)}\n31\n${z2.toFixed(4)}\n`;
            dxf += `12\n${x3.toFixed(4)}\n22\n${y3.toFixed(4)}\n32\n${z3.toFixed(4)}\n`;
            dxf += `13\n${x4.toFixed(4)}\n23\n${y4.toFixed(4)}\n33\n${z4.toFixed(4)}\n`;
        }
    }
    
    dxf += "0\nENDSEC\n0\nEOF\n";
    return dxf;
};