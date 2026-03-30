
import { ColorStop, getColorForRelief } from './colorPalettes';

// This function was moved from App.tsx and updated with an 'invert' option.
export const generateHillshadeBlob = async (
  width: number, height: number, elevationData: Float32Array | number[],
  resolutionX: number, resolutionY: number,
  options: { contrast: number, brightness: number, filter?: string, invert?: boolean }
): Promise<Blob> => {
  const offscreenCanvas = document.createElement('canvas');
  offscreenCanvas.width = width;
  offscreenCanvas.height = height;
  const ctx = offscreenCanvas.getContext('2d');
  if (!ctx) throw new Error("Could not create offscreen canvas context.");

  const imageData = ctx.createImageData(width, height);
  const imgData = imageData.data;
  // Change sun azimuth if inverted to flip the lighting direction
  const sunAzimuth = (options.invert ? 135 : 315) * (Math.PI / 180);
  const sunAltitude = 45 * (Math.PI / 180);
  const cosSunAltitude = Math.cos(sunAltitude);
  const sinSunAltitude = Math.sin(sunAltitude);

  const getElev = (x: number, y: number) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return 0;
    return elevationData[y * width + x];
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tl = getElev(x - 1, y - 1); const t = getElev(x, y - 1); const tr = getElev(x + 1, y - 1);
      const l = getElev(x - 1, y); const r = getElev(x + 1, y);
      const bl = getElev(x - 1, y + 1); const b = getElev(x, y + 1); const br = getElev(x + 1, y + 1);

      const dzdx = (tr + 2 * r + br) - (tl + 2 * l + bl);
      const dzdy = (bl + 2 * b + br) - (tl + 2 * t + tr);

      // Calculate gradient components accounting for pixel size in meters
      // The factor 8 comes from the Sobel operator kernel weights
      const gradX = dzdx / (8 * resolutionX);
      const gradY = dzdy / (8 * resolutionY);

      const slope = Math.atan(Math.sqrt(gradX * gradX + gradY * gradY));
      // FIX: Corrected typo from `dxdx` to `dzdx` for aspect calculation.
      const aspect = Math.atan2(gradY, -gradX); // Aspect based on metric gradients

      let shade = ((cosSunAltitude * Math.cos(slope)) + (sinSunAltitude * Math.sin(slope) * Math.cos(sunAzimuth - aspect)));
      shade = Math.max(0, shade);
      const color = Math.min(255, Math.round(shade * options.contrast) + options.brightness);
      
      const index = (y * width + x) * 4;
      imgData[index] = color; imgData[index + 1] = color; imgData[index + 2] = color; imgData[index + 3] = 255;
    }
  }
  ctx.putImageData(imageData, 0, 0);

  // Apply post-processing and convert to high-quality Blob
  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = width;
  finalCanvas.height = height;
  const finalCtx = finalCanvas.getContext('2d');
  if (!finalCtx) throw new Error("Could not create final canvas context.");

  if (options.filter) {
    finalCtx.filter = options.filter;
  }

  finalCtx.drawImage(offscreenCanvas, 0, 0);

  return new Promise((resolve, reject) => {
    finalCanvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to create JPG from canvas.'));
    }, 'image/jpeg', 1.0); // MAX Quality
  });
};

// This function was moved from components/ResultDisplay.tsx
export const generateColorReliefBlob = async (
    width: number, height: number, elevationData: Float32Array | number[], 
    resolutionX: number, resolutionY: number,
    minElevation: number, colorStops: ColorStop[]
): Promise<Blob> => {
    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = width;
    offscreenCanvas.height = height;
    const ctx = offscreenCanvas.getContext('2d');
    if (!ctx) throw new Error("Could not create offscreen canvas context.");

    const getElev = (x: number, y: number) => {
        if (x < 0 || x >= width || y < 0 || y >= height) return 0;
        return elevationData[y * width + x];
    };

    // 1. Compute hillshade values and normalize them to 0-1
    const hillshade = new Float32Array(width * height);
    const az = 315 * Math.PI / 180;
    const alt = 45 * Math.PI / 180;
    const sinAlt = Math.sin(alt);
    const cosAlt = Math.cos(alt);
    let minShade = Infinity, maxShade = -Infinity;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const tl = getElev(x - 1, y - 1); const t = getElev(x, y - 1); const tr = getElev(x + 1, y - 1);
            const l = getElev(x - 1, y); const r = getElev(x + 1, y);
            const bl = getElev(x - 1, y + 1); const b = getElev(x, y + 1); const br = getElev(x + 1, y + 1);

            const dzdx = (tr + 2 * r + br) - (tl + 2 * l + bl);
            const dzdy = (bl + 2 * b + br) - (tl + 2 * t + tr);
            
            const gradX = dzdx / (8 * resolutionX);
            const gradY = dzdy / (8 * resolutionY);

            const slope = Math.atan(Math.sqrt(gradX * gradX + gradY * gradY));
            const aspect = Math.atan2(gradY, -gradX);
            
            const shadeValue = sinAlt * Math.sin(slope) + cosAlt * Math.cos(slope) * Math.cos(az - aspect);
            const index = y * width + x;
            hillshade[index] = shadeValue;
            if (shadeValue < minShade) minShade = shadeValue;
            if (shadeValue > maxShade) maxShade = shadeValue;
        }
    }

    const shadeRange = maxShade - minShade;
    if (shadeRange > 0) {
        for (let i = 0; i < hillshade.length; i++) {
            hillshade[i] = (hillshade[i] - minShade) / shadeRange;
        }
    }

    // 2. Combine color ramp with hillshade
    const localMin = minElevation;
    const localMax = minElevation + 500;
    const range = localMax - localMin;
    const imageData = ctx.createImageData(width, height);
    const imgData = imageData.data;
    for (let i = 0; i < elevationData.length; i++) {
        const elev = elevationData[i];
        const t = range > 0 ? (elev - localMin) / range : 0;
        const [r, g, b] = getColorForRelief(t, colorStops);
        const shade = hillshade[i];
        
        const ambientLight = 0.4; 
        const finalShade = ambientLight + shade * (1 - ambientLight);

        const idx = i * 4;
        imgData[idx] = r * finalShade;
        imgData[idx + 1] = g * finalShade;
        imgData[idx + 2] = b * finalShade;
        imgData[idx + 3] = 255;
    }
    
    ctx.putImageData(imageData, 0, 0);

    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = width;
    finalCanvas.height = height;
    const finalCtx = finalCanvas.getContext('2d');
    if (!finalCtx) throw new Error("Could not create final canvas context.");
    finalCtx.filter = 'contrast(120%) brightness(105%) saturate(120%)';
    finalCtx.drawImage(offscreenCanvas, 0, 0);

    return new Promise((resolve, reject) => {
        finalCanvas.toBlob(blob => {
            if (blob) resolve(blob);
            else reject(new Error('Failed to create JPG from canvas.'));
        }, 'image/jpeg', 1.0);
    });
};
