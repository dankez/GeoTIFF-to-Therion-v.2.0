// --- Helper Functions for Color Manipulation ---

export const hexToRgb = (hex: string): [number, number, number] => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [0, 0, 0];
};

const interpolateColor = (color1: [number, number, number], color2: [number, number, number], factor: number): [number, number, number] => {
    const r = color1[0] + factor * (color2[0] - color1[0]);
    const g = color1[1] + factor * (color2[1] - color1[1]);
    const b = color1[2] + factor * (color2[2] - color1[2]);
    return [r, g, b];
};

// --- Type Definitions ---

export interface ColorStop {
    t: number;
    color: [number, number, number];
}

export interface ColorPalette {
    id: string;
    name: string;
    stops: ColorStop[];
    legendLabels: {
        top: string;
        middleTop: string;
        middleBottom: string;
        bottom: string;
    }
}

// --- Palette Definitions ---

export const VIBRANT_PALETTE: ColorPalette = {
    id: 'vibrant',
    name: 'Živá (Vysoký Kontrast)',
    stops: [
        { t: 0.00, color: hexToRgb('#d9ff7a') },
        { t: 0.15, color: hexToRgb('#c9ff66') },
        { t: 0.30, color: hexToRgb('#b6ff80') },
        { t: 0.50, color: hexToRgb('#ffe375') },
        { t: 0.65, color: hexToRgb('#ffc857') },
        { t: 0.80, color: hexToRgb('#ffb84a') },
        { t: 1.00, color: hexToRgb('#ffe6a8') }
    ],
    legendLabels: {
        top: 'vrcholky',
        middleTop: 'vyvýšeniny',
        middleBottom: 'roviny',
        bottom: 'doly'
    }
};

export const MINTY_PALETTE: ColorPalette = {
    id: 'minty',
    name: 'Mintová (Jemná)',
    stops: [
        { t: 0.00, color: hexToRgb('#d6f2e2') },
        { t: 0.15, color: hexToRgb('#c9efda') },
        { t: 0.30, color: hexToRgb('#e4f5d4') },
        { t: 0.50, color: hexToRgb('#f0f8cc') },
        { t: 0.65, color: hexToRgb('#f8f3be') },
        { t: 0.80, color: hexToRgb('#fff1b0') },
        { t: 1.00, color: hexToRgb('#fff8d9') }
    ],
    legendLabels: {
        top: 'vrcholy',
        middleTop: 'vysočiny',
        middleBottom: 'roviny',
        bottom: 'depresie'
    }
};

export const HEATMAP_PALETTE: ColorPalette = {
    id: 'heatmap',
    name: 'Teplotná Mapa (Heatmap)',
    stops: [
        { t: 0.0,  color: hexToRgb('#00BFFF') }, // DeepSkyBlue - Brighter blue
        { t: 0.25, color: hexToRgb('#00FF7F') }, // SpringGreen
        { t: 0.5,  color: hexToRgb('#FFFF00') }, // Yellow
        { t: 0.75, color: hexToRgb('#FFA500') }, // Orange
        { t: 1.0,  color: hexToRgb('#FF0000') }  // Red
    ],
    legendLabels: {
        top: 'vysoké',
        middleTop: '',
        middleBottom: 'stredné',
        bottom: 'nízke'
    }
};


export const COLOR_PALETTES: ColorPalette[] = [
    VIBRANT_PALETTE,
    MINTY_PALETTE,
    HEATMAP_PALETTE
];

// --- Main Color Calculation Function ---

export const getColorForRelief = (t: number, stops: ColorStop[]): [number, number, number] => {
    t = Math.max(0, Math.min(1, t));
    if (t <= stops[0].t) return stops[0].color;
    
    for (let i = 0; i < stops.length - 1; i++) {
        const startStop = stops[i];
        const endStop = stops[i + 1];

        if (t >= startStop.t && t <= endStop.t) {
            const factor = (t - startStop.t) / (endStop.t - startStop.t);
            return interpolateColor(startStop.color, endStop.color, factor);
        }
    }

    return stops[stops.length - 1].color;
};