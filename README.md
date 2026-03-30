# Easy Terrain / Terén Ľahko

<div align="center">
  <!-- You can replace this text with the actual SVG or an image link if hosted -->
  <h3>🦙⛰️</h3>
  <p><strong>The ultimate surface generation tool for Therion / Dokonalý nástroj na tvorbu povrchu pre Therion</strong></p>
</div>

---

## 🌍 Overview / Prehľad

**Easy Terrain** is a modern, browser-based application designed for cavers and surveyors. It simplifies the complex process of creating digital terrain models (DTMs) for cave surveying software like **Therion**.

**Easy Terrain** je moderná webová aplikácia navrhnutá pre jaskyniarov a zememeračov. Zjednodušuje zložitý proces tvorby digitálnych modelov terénu (DMR) pre mapovací softvér **Therion**.

---

## 🚀 Key Features / Kľúčové Funkcie

### English 🇬🇧
*   **✨ 100% Client-Side & Secure**: All processing happens in your browser. Your data never leaves your device.
*   **🛰️ Auto Surface (New!)**: Automatically download global elevation data (ALOS World 3D - 30m) from OpenTopography based on GPS coordinates.
*   **📁 Local File Support**: Drag & drop your own GeoTIFF (`.tif`) and World Files (`.tfw`).
*   **✂️ Interactive Cropping**: Visually select the exact area you need to reduce file size and processing time.
*   **📐 Smart Projections**: Automatically handles coordinate conversions. Downloads are projected to **UTM** for metric precision, while local files support **S-JTSK**, **UTM**, and **WGS84**.
*   **🎨 Advanced Visualization**:
    *   **Hillshades**: Classic and High-Contrast modes.
    *   **Color Relief**: Visualize elevation with Vibrant, Mint, or Heatmap palettes.
    *   **Invert Surface**: Toggle lighting direction to fix optical illusions (concave/convex perception).
*   **📦 Comprehensive Exports**:
    *   **Therion (.th)**: Ready-to-use surface grid with image calibration.
    *   **CAD (.dxf)**: 3D Faces for AutoCAD, MicroStation, etc.
    *   **3D Model (.stl)**: Binary mesh for 3D printing or Blender.
    *   **Data (.txt)**: Raw grid elevation data.

### Slovensky 🇸🇰
*   **✨ 100% Klientske & Bezpečné**: Celé spracovanie prebieha v prehliadači. Vaše dáta nikdy neopustia váš počítač.
*   **🛰️ Automatický Povrch (Nové!)**: Automatické stiahnutie globálnych výškových dát (ALOS World 3D - 30m) z OpenTopography na základe GPS súradníc.
*   **📁 Podpora Lokálnych Súborov**: Potiahnite a pustite vlastné GeoTIFF (`.tif`) a World Files (`.tfw`).
*   **✂️ Interaktívne Orezanie**: Vizuálne vyberte presnú oblasť, ktorú potrebujete, čím zmenšíte veľkosť súboru.
*   **📐 Inteligentné Projekcie**: Automaticky rieši konverzie súradníc. Stiahnuté dáta sa prepočítajú do **UTM** pre metrickú presnosť, lokálne súbory podporujú **S-JTSK**, **UTM** a **WGS84**.
*   **🎨 Pokročilá Vizualizácia**:
    *   **Tieňovanie**: Klasický a Vysoko kontrastný režim.
    *   **Farebný Reliéf**: Vizualizácia výšky pomocou paliet Živá, Mintová alebo Teplotná mapa.
    *   **Invertovať Povrch**: Prepínač smeru svetla na opravu optických klamov (výbežok vs. jama).
*   **📦 Komplexné Exporty**:
    *   **Therion (.th)**: Hotový súbor povrchu s kalibráciou obrázka.
    *   **CAD (.dxf)**: 3D plochy (3DFACE) pre AutoCAD, MicroStation, atď.
    *   **3D Model (.stl)**: Binárny mesh pre 3D tlač alebo Blender.
    *   **Dáta (.txt)**: Surové výškové dáta mriežky.

---

## 📖 How to Use / Ako Používať

### Mode A: Auto Surface (Recommended for Global Data)
1.  Click the **Auto Surface** tab.
2.  **Enter Location**: Type Lat/Lon coordinates or click "My Location".
3.  **Set Dimensions**: Define the size of the area in meters (e.g., 5000m x 5000m).
4.  **Download**: Click "Download & Process". The app fetches ALOS data, reprojects it to UTM (metric), creates the grid, and prepares output files.

### Mode B: Upload File (Recommended for High-Res Local Data)
1.  Click the **Upload File** tab.
2.  **Drag & Drop**: Upload your `.tif` and `.tfw` files (e.g., DMR 5.0 from ZBGIS).
3.  **Settings**: Select the correct Coordinate System (e.g., "S-JTSK" for Slovakia).
4.  **Preview & Crop**: Check the visual preview. Use the **Crop Surface** button to select a smaller area if needed.
5.  **Convert**: Click "Convert Files".

### Režim A: Automatický Povrch (Odporúčané pre svet)
1.  Kliknite na záložku **Automatický povrch**.
2.  **Zadajte Polohu**: Napíšte GPS súradnice alebo kliknite na "Moja poloha".
3.  **Nastavte Rozmery**: Zadajte veľkosť územia v metroch (napr. 5000m x 5000m).
4.  **Stiahnuť**: Kliknite na "Stiahnuť a spracovať". Aplikácia stiahne dáta ALOS, prepočíta ich do UTM (metre), vytvorí mriežku a pripraví výstupy.

### Režim B: Nahrať Súbor (Odporúčané pre detailné lokálne dáta)
1.  Kliknite na záložku **Nahrať súbor**.
2.  **Nahrajte Súbory**: Presuňte `.tif` a `.tfw` súbory (napr. DMR 5.0 zo ZBGIS).
3.  **Nastavenia**: Zvoľte správny Súradnicový systém (napr. "S-JTSK" pre SR).
4.  **Náhľad a Orezanie**: Skontrolujte náhľad. Tlačidlom **Orezať povrch** môžete vybrať menšiu oblasť.
5.  **Konvertovať**: Kliknite na "Konvertovať súbory".

---

## 🛠️ Tools & Outputs / Nástroje a Výstupy

| Feature / Funkcia | Description (EN) | Popis (SK) |
| :--- | :--- | :--- |
| **Therion (.th)** | The main definition file containing grid, input reference, and map image calibration. | Hlavný definičný súbor obsahujúci mriežku, referenciu vstupu a kalibráciu mapy. |
| **Grid Data (.txt)** | The raw elevation matrix required by Therion. | Surová matica výšok vyžadovaná Therionom. |
| **DXF Export** | 3D Faces mesh compatible with standard CAD tools. Useful for surveyors. | Sieť 3D plôch kompatibilná s CAD nástrojmi. Užitočné pre geodetov. |
| **STL Export** | Binary STL mesh for 3D printing terrain models. | Binárny STL model pre 3D tlač terénu. |
| **Raw Data (.bin)** | Raw elevation data before processing. | Surové výškové dáta pred spracovaním. |
| **Invert Surface** | Changes sun azimuth by 180° to fix "relief inversion" optical illusions. | Zmení azimut slnka o 180° na opravu optického klamu "inverzie reliéfu". |
| **Resample** | Reduces grid resolution (e.g., factor 2 = 25% of original size) to optimize performance. | Znižuje rozlíšenie mriežky (napr. faktor 2 = 25% pôvodnej veľkosti) pre lepší výkon. |

---

## ℹ️ Data Sources / Zdroje Dát

*   **Auto Mode**: Uses the **ALOS World 3D - 30m (AW3D30)** dataset provided by JAXA via the [OpenTopography API](https://opentopography.org/).
*   **Local Mode (Slovakia)**: Optimized for **DMR 5.0** data from [ZBGIS Map Portal](https://zbgis.skgeodesy.sk/mapka/sk/teren).
*   **Local Mode (Czech Republic)**: Supports **DMR 5G** and **DMP OK** data from [ČÚZK](https://ags.cuzk.gov.cz/). For orthophoto data, please visit the [ČÚZK Open Data portal](https://openzu.cuzk.gov.cz/opendata/ORTOFOTO/).

---

## 📝 Credits

Designed and developed for the speleological community.
*Navrhnuté a vyvinuté pre jaskyniarsku komunitu.*

**Author:** DankeZ
**License:** MIT
