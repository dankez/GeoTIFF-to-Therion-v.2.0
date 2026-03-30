import React, { useRef, useEffect } from 'react';
import { ColorStop, getColorForRelief } from '../colorPalettes';

interface HillshadeCanvasProps {
    width: number;
    height: number;
    elevationData: Float32Array | number[];
    minElevation: number;
    maxElevation: number;
    colorStops?: ColorStop[] | null;
}

export const HillshadeCanvas: React.FC<HillshadeCanvasProps> = ({
    width, height, elevationData, minElevation, maxElevation, colorStops
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;
        
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        
        // Calculate Skip Factor for large images
        // Target roughly 16 million pixels max for preview performance and safety
        const SAFE_PIXEL_COUNT = 16000000;
        const totalPixels = width * height;
        let skip = 1;
        if (totalPixels > SAFE_PIXEL_COUNT) {
            skip = Math.ceil(Math.sqrt(totalPixels / SAFE_PIXEL_COUNT));
        }

        const viewWidth = Math.floor(width / skip);
        const viewHeight = Math.floor(height / skip);

        const offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = viewWidth;
        offscreenCanvas.height = viewHeight;
        const offscreenCtx = offscreenCanvas.getContext('2d');
        if (!offscreenCtx) return;

        const getElevation = (x: number, y: number) => {
            // Map view coordinates back to source coordinates
            const sx = x * skip;
            const sy = y * skip;
            if (sx < 0 || sx >= width || sy < 0 || sy >= height) return 0;
            return elevationData[sy * width + sx];
        };

        // Helper to get elevation with offset for gradient calc, respecting skip
        const getElevRel = (cx: number, cy: number, dx: number, dy: number) => {
             const sx = (cx + dx) * skip;
             const sy = (cy + dy) * skip;
             if (sx < 0 || sx >= width || sy < 0 || sy >= height) return 0;
             return elevationData[sy * width + sx];
        }


        if (colorStops) {
            // Render Color Relief + Hillshade (mimics App.tsx generation logic for preview)
            const hillshade = new Float32Array(viewWidth * viewHeight);
            const az = 315 * Math.PI / 180;
            const alt = 45 * Math.PI / 180;
            const sinAlt = Math.sin(alt);
            const cosAlt = Math.cos(alt);
            let minShade = Infinity, maxShade = -Infinity;

            for (let y = 0; y < viewHeight; y++) {
                for (let x = 0; x < viewWidth; x++) {
                    const tl = getElevRel(x, y, -1, -1); const t = getElevRel(x, y, 0, -1); const tr = getElevRel(x, y, 1, -1);
                    const l = getElevRel(x, y, -1, 0);   const r = getElevRel(x, y, 1, 0);
                    const bl = getElevRel(x, y, -1, 1);  const b = getElevRel(x, y, 0, 1);  const br = getElevRel(x, y, 1, 1);
                    
                    const dzdx = ((tr + 2 * r + br) - (tl + 2 * l + bl)) / skip;
                    const dzdy = ((bl + 2 * b + br) - (tl + 2 * t + tr)) / skip;
                    
                    const slope = Math.atan(Math.sqrt(dzdx * dzdx + dzdy * dzdy) / (8 * skip));
                    const aspect = Math.atan2(dzdy, -dzdx);
                    const shadeValue = sinAlt * Math.sin(slope) + cosAlt * Math.cos(slope) * Math.cos(az - aspect);
                    const index = y * viewWidth + x;
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
            
            const localMin = minElevation;
            const localMax = minElevation + 500;
            const range = localMax - localMin;
            const imageData = offscreenCtx.createImageData(viewWidth, viewHeight);
            const imgData = imageData.data;
            
            for (let y = 0; y < viewHeight; y++) {
                for (let x = 0; x < viewWidth; x++) {
                    const elev = getElevation(x, y);
                    const i = y * viewWidth + x;
                    const t = range > 0 ? (elev - localMin) / range : 0;
                    const [r, g, b] = getColorForRelief(t, colorStops);
                    const shade = hillshade[i]; // Combine color with shade
                    const idx = i * 4;
                    imgData[idx] = r * shade;
                    imgData[idx + 1] = g * shade;
                    imgData[idx + 2] = b * shade;
                    imgData[idx + 3] = 255;
                }
            }
            offscreenCtx.putImageData(imageData, 0, 0);

        } else {
            // Render Grayscale Hillshade (original logic)
            const imageData = offscreenCtx.createImageData(viewWidth, viewHeight);
            const data = imageData.data;
            const sunAzimuth = 315 * (Math.PI / 180);
            const sunAltitude = 45 * (Math.PI / 180);
            const cosSunAltitude = Math.cos(sunAltitude);
            const sinSunAltitude = Math.sin(sunAltitude);

            for (let y = 0; y < viewHeight; y++) {
                for (let x = 0; x < viewWidth; x++) {
                    const tl = getElevRel(x, y, -1, -1); const t = getElevRel(x, y, 0, -1); const tr = getElevRel(x, y, 1, -1);
                    const l = getElevRel(x, y, -1, 0);   const r = getElevRel(x, y, 1, 0);
                    const bl = getElevRel(x, y, -1, 1);  const b = getElevRel(x, y, 0, 1);  const br = getElevRel(x, y, 1, 1);
                    
                    const dzdx = ((tr + 2 * r + br) - (tl + 2 * l + bl)) / skip;
                    const dzdy = ((bl + 2 * b + br) - (tl + 2 * t + tr)) / skip;
                    
                    const slope = Math.atan(Math.sqrt(dzdx * dzdx + dzdy * dzdy) / (8 * skip));
                    const aspect = Math.atan2(dzdy, -dzdx);
                    let shade = ((cosSunAltitude * Math.cos(slope)) + (sinSunAltitude * Math.sin(slope) * Math.cos(sunAzimuth - aspect)));
                    shade = Math.max(0, shade);
                    const color = Math.round(shade * 200) + 55;
                    const index = (y * viewWidth + x) * 4;
                    data[index] = color; data[index + 1] = color; data[index + 2] = color; data[index + 3] = 255;
                }
            }
            offscreenCtx.putImageData(imageData, 0, 0);
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(offscreenCanvas, 0, 0, canvas.width, canvas.height);

    }, [width, height, elevationData, minElevation, maxElevation, colorStops]);

    return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />;
};