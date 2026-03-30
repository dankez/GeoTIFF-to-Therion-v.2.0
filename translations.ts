
export const translations = {
  sk: {
    // Header
    appTitle: 'Terén Ľahko',
    appDescription: 'Nástroj pre jaskyniarov. Konvertujte lokálne GeoTIFF súbory alebo automaticky sťahujte satelitné výškové dáta (ALOS World 3D) a generujte presné 3D modely povrchu pre Therion (.th). Bez inštalácie – funguje 100% vo vašom prehliadači.',
    // Footer
    footerText: 'Navrhnuté pre jaskyniarov a nadšencov geológie. author: DankeZ',
    switchToEN: 'Switch to English',
    switchToSK: 'Prepnúť na Slovenčinu',
    
    // Mode Selection
    tab_upload: 'Nahrať súbor',
    tab_auto: 'Automatický povrch',

    // File Input
    fileInputTitle: 'Nahrajte súbory',
    fileInputPrompt: 'Potiahnite a pustite, alebo kliknite pre nahratie',
    fileInputSelected: 'Súbory pripravené na spracovanie',
    fileSlotEmpty: 'Chýba súbor',
    fileSlotOptional: '(Voliteľné)',
    error_missing_one_file: 'Prosím, nahrajte jeden .tif a jeden .tfw súbor.',
    error_too_many_files: 'Boli vybrané viac ako dva súbory. Prosím, vyberte len jeden .tif a jeden .tfw.',
    error_missing_tif: 'Chýba .tif súbor.',
    error_missing_tfw: 'Chýba .tfw súbor.',
    error_mismatched_names: 'Názvy .tif a .tfw súborov sa nezhodujú.',
    error_tfw_required: 'Tento .tif súbor neobsahuje georeferenčné údaje. Prosím, nahrajte aj príslušný .tfw súbor.',

    // Auto Download
    auto_title: 'Automatický povrch z OpenTopography',
    auto_desc: 'Stiahne a spracuje výškové dáta (30m) pre vami zvolenú oblasť.',
    auto_explanation: 'Zadajte súradnice a rozmery pre automatické stiahnutie globálnych výškových dát s rozlíšením 30m. Aplikácia prepočíta dáta do UTM, vygeneruje tieňovaný reliéf a pripraví kompletný súbor povrchu pre Therion.',
    auto_location: 'Stredová poloha (GPS)',
    auto_use_current: 'Moja poloha',
    auto_dimensions_m: 'Rozmery oblasti (m)',
    auto_dim_north: 'Sever',
    auto_dim_south: 'Juh',
    auto_dim_east: 'Východ',
    auto_dim_west: 'Západ',
    auto_download_btn: 'Stiahnuť a spracovať',
    auto_downloading: 'Sťahujem dáta...',
    auto_error_coords: 'Zadajte platné GPS súradnice.',
    auto_error_coords_range: 'Súradnice sú mimo rozsahu (Lat -90/90, Lon -180/180).',
    auto_error_apikey: 'Chýba API kľúč.',
    auto_get_apikey: 'Získať API kľúč (Zdarma)',

    // App states
    parsing: 'Spracovávam súbory...',
    converting: 'Konvertujem...',
    zipping: 'Vytváram .zip...',
    errorPrefix: 'Chyba:',

    // Preview & Settings
    preview_dataInfo: 'Informácie o súbore (GDAL Info)',
    preview_filename: 'Názov súboru',
    preview_dimensions: 'Rozmery',
    preview_resolution: 'Rozlíšenie',
    preview_minElevation: 'Min. výška',
    preview_maxElevation: 'Max. výška',
    preview_visual: 'Vizuálny náhľad',

    preview_settings: 'Nastavenia Konverzie',
    preview_cs: 'Súradnicový systém',
    preview_resample: 'Faktor prevzorkovania',
    preview_resample_desc: 'Faktor 2 vytvorí z mriežky 1x1m mriežku 2x2m, čím zníži počet bodov o 75%.',
    
    preview_resultingGrid: 'Výsledná mriežka:',
    preview_newDimensions: 'Nové rozmery',
    preview_newResolution: 'Nové rozlíšenie',
    
    convertButton: 'Konvertovať súbory',
    cropButton: 'Orezať povrch',

    // Crop Modal
    cropModal_title: 'Interaktívne orezanie povrchu',
    cropModal_desc: 'Upravte oblasť potiahnutím hrán. Zmeny sa prejavia v reálnom čase.',
    cropModal_info: 'Informácie o výbere',
    cropModal_coords: 'Nové súradnice (origin)',
    cropModal_applyButton: 'Použiť orezanie a konvertovať',
    cropModal_cancelButton: 'Zrušiť',

    // Results
    result_success: 'Konverzia úspešná!',
    result_description: 'Vaše Therion povrchové súbory sú pripravené na stiahnutie.',
    result_select_header: 'Vyberte si najlepší povrch',
    result_gridInfo: (height: number, width: number) => `Mriežka: ${height} riadkov, ${width} stĺpcov.`,
    result_debugInfo: 'Protokol o spracovaní pre ladenie.',
    result_generating_classic: 'Generujem klasický reliéf...',
    result_generating_contrast: 'Generujem kontrastný reliéf...',
    result_generating_color_relief: 'Generujem farebný reliéf...',
    result_regenerate_title: 'Upraviť Mriežku & Pregenerovať',
    result_regenerate_desc: 'Zmena faktora ovplyvní rozmery mriežky. Všetky súbory budú pregenerované s novým nastavením.',
    result_regenerate_button: 'Pregenerovať',
    downloadButton: (ext: string) => `Stiahnuť ${ext}`,
    downloadAllButton: 'Therion data (.zip)',
    downloadDxfButton: 'DXF',
    downloadStlButton: 'STL',
    newConversionButton: 'Spustiť novú konverziu',
    imageModal_title: 'Náhľad v plnej veľkosti',
    imageModal_close: 'Zavrieť',
    imageModal_view: 'Zobraziť v plnej veľkosti',
    imageName_classic: 'Klasický',
    imageName_high_contrast: 'Vysoký Kontrast',
    imageName_color_relief: 'Farebný Reliéf',
    invertColors: 'Invertovať povrch',


    // Coordinate Systems
    cs_ijtsk_name: 'S-JTSK (JTSK03, Invertované Y)',
    cs_ijtsk_example: 'Príklad: X: -377168, Y: -1200776',
    cs_jtsk_name: 'S-JTSK (JTSK03)',
    cs_jtsk_example: 'Príklad: X: 377168, Y: 1200776',
    cs_utm33n_name: 'UTM 33N',
    cs_utm33n_example: 'Príklad: X: 582155, Y: 5333156',
    cs_utm34n_name: 'UTM 34N',
    cs_utm34n_example: 'Príklad: X: 339034, Y: 5349764',
    cs_wgs84_name: 'WGS 84 (Lat/Lon)',
    cs_wgs84_example: 'Príklad: Lat: 48.14, Lon: 17.10',

    // Instructions
    instructions_title: 'Ako to funguje',
    instructions_step1_title: 'Krok 1: Stiahnite si dáta',
    instructions_step1_desc: 'Digitálny model reliéfu (DMR 5.0) si môžete stiahnuť z oficiálneho portálu ZBGIS. V exporte zvoľte formát GeoTIFF dmr5 alebo 6.',
    instructions_zbgis_link: 'Otvoriť mapový portál ZBGIS',
    instructions_step2_title: 'Krok 2: Nahrajte súbory',
    instructions_step2_desc: 'Presuňte stiahnuté súbory (.tif a .tfw) do nahrávacieho okna vyššie. Oba súbory musia mať rovnaký názov.',
    instructions_step3_title: 'Krok 3: Nastavte konverziu',
    instructions_step3_desc: 'Po nahratí skontrolujte metadáta a zvoľte správny súradnicový systém (pre dáta zo ZBGIS je to "S-JTSK"). Prípadne upravte faktor prevzorkovania, ak Therion vypise pri kompilacii line too long, zmente default cislo z 1 na 2+.',
    instructions_step4_title: 'Krok 4: Stiahnite výsledky',
    instructions_step4_desc: 'Po konverzii si stiahnite vygenerované súbory .th, .txt a .log, alebo všetko naraz v .zip archíve. Súbor .th môžete priamo použiť vo vašom Therion projekte.',
  },
  en: {
    // Header
    appTitle: 'Easy Terrain',
    appDescription: 'The ultimate tool for cavers and surveyors. Convert local GeoTIFF files or automatically download satellite elevation data (ALOS World 3D) to generate precise 3D surface models for Therion (.th). No installation required – works 100% in your browser.',
    // Footer
    footerText: 'Designed for cave surveyors and geology enthusiasts. Author: DankeZ www.sss.sk',
    switchToSK: 'Prepnúť na Slovenčinu',
    switchToEN: 'Switch to English',
    
    // Mode Selection
    tab_upload: 'Upload File',
    tab_auto: 'Auto Surface',

    // File Input
    fileInputTitle: 'Upload Files',
    fileInputPrompt: 'Drag & drop or click to upload',
    fileInputSelected: 'Files are ready for processing',
    fileSlotEmpty: 'File missing',
    fileSlotOptional: '(Optional)',
    error_missing_one_file: 'Please upload one .tif and one .tfw file.',
    error_too_many_files: 'More than two files were selected. Please select only one .tif and one .tfw file.',
    error_missing_tif: 'Missing .tif file.',
    error_missing_tfw: 'Missing .tfw file.',
    error_mismatched_names: 'The .tif and .tfw filenames do not match.',
    error_tfw_required: 'This .tif file lacks embedded georeferencing data. Please also upload the corresponding .tfw file.',

    // Auto Download
    auto_title: 'Auto Surface from OpenTopography',
    auto_desc: 'Download and process elevation data (30m) for your area of interest.',
    auto_explanation: 'Enter coordinates and dimensions to automatically fetch 30m resolution global elevation data. The app projects the data to UTM, generates a hillshade grid, and prepares a complete Therion surface file.',
    auto_location: 'Center Location (GPS)',
    auto_use_current: 'My Location',
    auto_dimensions_m: 'Area Dimensions (m)',
    auto_dim_north: 'North',
    auto_dim_south: 'South',
    auto_dim_east: 'East',
    auto_dim_west: 'West',
    auto_download_btn: 'Download & Process',
    auto_downloading: 'Downloading data...',
    auto_error_coords: 'Please enter valid GPS coordinates.',
    auto_error_coords_range: 'Coordinates out of range (Lat -90/90, Lon -180/180).',
    auto_error_apikey: 'Missing API Key.',
    auto_get_apikey: 'Get API Key (Free)',

    // App states
    parsing: 'Parsing files...',
    converting: 'Converting...',
    zipping: 'Creating .zip...',
    errorPrefix: 'Error:',

    // Preview & Settings
    preview_dataInfo: 'File Information (GDAL Info)',
    preview_filename: 'Filename',
    preview_dimensions: 'Dimensions',
    preview_resolution: 'Resolution',
    preview_minElevation: 'Min Elevation',
    preview_maxElevation: 'Max Elevation',
    preview_visual: 'Visual Preview',

    preview_settings: 'Conversion Settings',
    preview_cs: 'Coordinate System',
    preview_resample: 'Resample Factor',
    preview_resample_desc: 'A factor of 2 creates a 2x2m grid from a 1x1m source, reducing points by 75%.',
    
    preview_resultingGrid: 'Resulting Grid:',
    preview_newDimensions: 'New Dimensions',
    preview_newResolution: 'New Resolution',

    convertButton: 'Convert Files',
    cropButton: 'Crop Surface',
    
    // Crop Modal
    cropModal_title: 'Interactive Surface Crop',
    cropModal_desc: 'Adjust the selection by dragging the edges. New coordinates are updated in real-time.',
    cropModal_info: 'Selection Info',
    cropModal_coords: 'New Coordinates (Origin)',
    cropModal_applyButton: 'Apply Crop & Convert',
    cropModal_cancelButton: 'Cancel',

    // Results
    result_success: 'Conversion Successful!',
    result_description: 'Your Therion surface files are ready for download.',
    result_select_header: 'Select the Best Surface',
    result_gridInfo: (height: number, width: number) => `Grid: ${height} rows, ${width} columns.`,
    result_debugInfo: 'Process log for debugging.',
    result_generating_classic: 'Generating classic hillshade...',
    result_generating_contrast: 'Generating high-contrast hillshade...',
    result_generating_color_relief: 'Generating color relief...',
    result_regenerate_title: 'Adjust Grid & Regenerate',
    result_regenerate_desc: 'Changing the factor affects grid dimensions. All files will be regenerated with the new setting.',
    result_regenerate_button: 'Regenerate',
    downloadButton: (ext: string) => `Download ${ext}`,
    downloadAllButton: 'Therion data (.zip)',
    downloadDxfButton: 'DXF',
    downloadStlButton: 'STL',
    newConversionButton: 'Start New Conversion',
    imageModal_title: 'Full Size Preview',
    imageModal_close: 'Close',
    imageModal_view: 'View Full Size',
    imageName_classic: 'Classic',
    imageName_high_contrast: 'High Contrast',
    imageName_color_relief: 'Color Relief',
    invertColors: 'Invert Surface',
    
    // Coordinate Systems
    cs_ijtsk_name: 'S-JTSK (JTSK03, Inverted Y)',
    cs_ijtsk_example: 'Example: X: -377168, Y: -1200776',
    cs_jtsk_name: 'S-JTSK (JTSK03)',
    cs_jtsk_example: 'Example: X: 377168, Y: 1200776',
    cs_utm33n_name: 'UTM 33N',
    cs_utm33n_example: 'Example: X: 582155, Y: 5333156',
    cs_utm34n_name: 'UTM 34N',
    cs_utm34n_example: 'Example: X: 339034, Y: 5349764',
    cs_wgs84_name: 'WGS 84 (Lat/Lon)',
    cs_wgs84_example: 'Example: Lat: 48.14, Lon: 17.10',
    
    // Instructions
    instructions_title: 'How It Works',
    instructions_step1_title: 'Step 1: Download Data',
    instructions_step1_desc: 'You can download the Digital Terrain Model (DMR 5.0) from the official ZBGIS portal. In the export tool, select the GeoTIFF format and draw a polygon to select your area.',
    instructions_zbgis_link: 'Open ZBGIS Map Portal',
    instructions_step2_title: 'Step 2: Upload Files',
    instructions_step2_desc: 'Drag and drop the downloaded files (.tif and .tfw) into the upload area above. Both files must have the same name.',
    instructions_step3_title: 'Step 3: Configure Conversion',
    instructions_step3_desc: 'After uploading, review the metadata and select the correct coordinate system (for ZBGIS data, this is "S-JTSK"). Adjust the resample factor if needed.',
    instructions_step4_title: 'Step 4: Download Results',
    instructions_step4_desc: 'After conversion, download the generated .th, .txt, and .log files, or all at once in a .zip archive. The .th file can be used directly in your Therion project.',
  }
};

export type Language = keyof typeof translations;
export type TranslationKey = keyof typeof translations.sk;
