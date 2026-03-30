

export const generateStlContent = (
    elevationData: Float32Array | number[],
    width: number,
    height: number,
    originX: number,
    originY: number,
    pixelSizeX: number,
    pixelSizeY: number
): DataView => {
    // 1. Calculate the number of valid triangles
    let triangleCount = 0;
    
    const isValid = (val: number) => {
        return isFinite(val) && Math.abs(val) < 3e38;
    };

    for (let y = 0; y < height - 1; y++) {
        for (let x = 0; x < width - 1; x++) {
            const i1 = y * width + x;
            const i2 = y * width + (x + 1);
            const i3 = (y + 1) * width + (x + 1);
            const i4 = (y + 1) * width + x;

            const z1 = elevationData[i1];
            const z2 = elevationData[i2];
            const z3 = elevationData[i3];
            const z4 = elevationData[i4];

            // If a quad has all valid vertices, it produces 2 triangles
            if (isValid(z1) && isValid(z2) && isValid(z3) && isValid(z4)) {
                triangleCount += 2;
            }
        }
    }

    // 2. Allocate buffer: 80 bytes header + 4 bytes count + (50 bytes * triangles)
    const bufferSize = 80 + 4 + (triangleCount * 50);
    const buffer = new ArrayBuffer(bufferSize);
    const view = new DataView(buffer);

    // 3. Write Header (80 bytes - initialized to 0, we can leave it empty or add a string)
    // We'll leave it blank (zeros) as permitted by spec.

    // 4. Write Triangle Count (UInt32, Little Endian)
    view.setUint32(80, triangleCount, true);

    // 5. Write Triangles
    let offset = 84;

    for (let y = 0; y < height - 1; y++) {
        for (let x = 0; x < width - 1; x++) {
            const i1 = y * width + x;
            const i2 = y * width + (x + 1);
            const i3 = (y + 1) * width + (x + 1);
            const i4 = (y + 1) * width + x;

            const z1 = elevationData[i1];
            const z2 = elevationData[i2];
            const z3 = elevationData[i3];
            const z4 = elevationData[i4];

            if (!isValid(z1) || !isValid(z2) || !isValid(z3) || !isValid(z4)) continue;

            // Coordinates
            const x1 = originX + x * pixelSizeX;
            const y1 = originY + y * pixelSizeY;
            
            const x2 = originX + (x + 1) * pixelSizeX;
            const y2 = originY + y * pixelSizeY;
            
            const x3 = originX + (x + 1) * pixelSizeX;
            const y3 = originY + (y + 1) * pixelSizeY;
            
            const x4 = originX + x * pixelSizeX;
            const y4 = originY + (y + 1) * pixelSizeY;

            // Define two triangles for the quad
            // T1: V1 -> V2 -> V4 (Top-Left, Top-Right, Bottom-Left)
            // T2: V2 -> V3 -> V4 (Top-Right, Bottom-Right, Bottom-Left)
            // Using Right-Hand Rule for counter-clockwise winding (Normal pointing up)
            
            // NOTE: Since y increases downwards in image coordinates (pixelSizeY is negative), 
            // "y1" is actually higher (more North) than "y3".
            // Let's rely on standard geometry.
            
            // Triangle 1: (x1, y1, z1) -> (x4, y4, z4) -> (x2, y2, z2) gives Up normal?
            // V1(TL), V4(BL), V2(TR)
            // Vector A = V4 - V1 = (0, dy, z4-z1)
            // Vector B = V2 - V1 = (dx, 0, z2-z1)
            // Cross A x B = (dy*z - ..., ..., 0*0 - dy*dx) -> Z component is -dy*dx
            // if pixelSizeY (dy) is negative and pixelSizeX (dx) is positive: -(-)*+ = + (Up)
            
            const writeTriangle = (
                vx1: number, vy1: number, vz1: number,
                vx2: number, vy2: number, vz2: number,
                vx3: number, vy3: number, vz3: number
            ) => {
                // Calc Normal
                const ux = vx2 - vx1;
                const uy = vy2 - vy1;
                const uz = vz2 - vz1;
                
                const vx = vx3 - vx1;
                const vy = vy3 - vy1;
                const vz = vz3 - vz1;

                let nx = uy * vz - uz * vy;
                let ny = uz * vx - ux * vz;
                let nz = ux * vy - uy * vx;

                // Normalize
                const len = Math.sqrt(nx*nx + ny*ny + nz*nz);
                if (len > 0) {
                    nx /= len; ny /= len; nz /= len;
                }

                // Write Normal
                view.setFloat32(offset, nx, true); offset += 4;
                view.setFloat32(offset, ny, true); offset += 4;
                view.setFloat32(offset, nz, true); offset += 4;

                // Write Vertices
                view.setFloat32(offset, vx1, true); offset += 4;
                view.setFloat32(offset, vy1, true); offset += 4;
                view.setFloat32(offset, vz1, true); offset += 4;

                view.setFloat32(offset, vx2, true); offset += 4;
                view.setFloat32(offset, vy2, true); offset += 4;
                view.setFloat32(offset, vz2, true); offset += 4;

                view.setFloat32(offset, vx3, true); offset += 4;
                view.setFloat32(offset, vy3, true); offset += 4;
                view.setFloat32(offset, vz3, true); offset += 4;

                // Attribute byte count (0)
                view.setUint16(offset, 0, true); offset += 2;
            };

            // T1: V1 -> V4 -> V2
            writeTriangle(x1, y1, z1, x4, y4, z4, x2, y2, z2);

            // T2: V2 -> V4 -> V3
            writeTriangle(x2, y2, z2, x4, y4, z4, x3, y3, z3);
        }
    }

    return view;
};