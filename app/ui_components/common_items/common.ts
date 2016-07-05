/** The different kinds of layers that can be created */
enum LayerTypes {
    /** Area by value maps. Distuingish different areas on map by setting color based on a value */
    ChoroplethMap,
    /** Dot density and dot maps. TODO */
    DotMap,
    /** Use different icons,shapes or graphs to pinpoint locations. */
    SymbolMap,
    /** Show intensity of a phenomenon by color scaling. TODO */
    HeatMap
}

/** Different supported symbol types */
enum SymbolTypes {
    /** Basic circular symbol. Uses L.CircleMarker. Can be resized and colored. */
    Circle,
    /** Basic rectancular symbol. Uses L.DivIcon. Width and height can both be resized, and color can be changed. */
    Rectangle,
    /** Pie- or donut chart based on multiple icons. Can be resized, but color scheme is static. */
    Chart,
    /** leaflet.Awesome-Markers- type marker. Uses Font Awesome-css to show a specific icon. */
    Icon,
    /** Create a stack of squares. Uses L.DivIcon. Square amount adjustable */
    Blocks,
}

/** Projection names to show in import wizard */
let DefaultProjections: Array<string> = ['WGS84', 'EPSG:4269', 'EPSG:3857', 'ETRS-GK25FIN'];

function GetSymbolSize(val: number, sizeMultiplier: number, minSize: number, maxSize: number) {
    let r = Math.sqrt(val * sizeMultiplier / Math.PI) * 2;
    if (r < minSize)
        r = minSize;
    else if (r > maxSize)
        r = maxSize;
    return r;

}

export {LayerTypes, SymbolTypes, DefaultProjections, GetSymbolSize}
