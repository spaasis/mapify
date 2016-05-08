declare var require: any;
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {LayerImportWizard} from './import_wizard/LayerImportWizard';
import {MapifyMenu} from './menu/Menu';
import {MapInitModel} from '../models/MapInitModel';
import {LayerTypes, SymbolTypes, GetSymbolRadius} from './common_items/common';
import {Filter} from './misc/Filter';
import {Legend} from './misc/Legend';
import 'leaflet';
import 'drmonty-leaflet-awesome-markers';
let Modal = require('react-modal');
let chroma = require('chroma-js');
let heat = require('leaflet.heat');
let domToImage = require('dom-to-image');
let _mapInitModel = new MapInitModel();
let _currentLayerId: number = 0;
let _currentFilterId: number = 0;

let _map: L.Map;

L.Icon.Default.imagePath = 'app/images/leaflet-images';

export class MapMain extends React.Component<{}, IMapMainStates>{


    private defaultColorOptions: IColorOptions = {
        fillColor: '#E0E62D',
        fillOpacity: 0.8,
        opacity: 0.8,
        color: '#000',
        choroplethFieldName: '',
        colorScheme: 'Greys',
        steps: 7,
        mode: 'q',
        revert: false,
    }
    private defaultVisOptions: IVisualizationOptions = {
        colorOptions: this.defaultColorOptions,
        symbolOptions: { symbolType: SymbolTypes.Circle },
        onEachFeature: this.addPopupsToLayer,
        pointToLayer: (function(feature, latlng: L.LatLng) {
            return L.circleMarker(latlng, this.defaultColorOptions)
        }),


    }
    constructor() {
        super();
        this.state = {
            importWizardShown: false,
            menuShown: false,
            layers: null,
            filters: {}
        };

    }
    componentDidMount() {
        _mapInitModel.InitCustomProjections();
        this.initMap();
    }

    /**
     * initMap - Initializes the map with basic options
     *
     * @return {void}
     */
    initMap() {
        let baseLayers: any = _mapInitModel.InitBaseMaps();
        _map = L.map('map', {
            layers: baseLayers,

        }).setView([0, 0], 2);
        _map.doubleClickZoom.disable();
        this.setState({
            importWizardShown: true,
            menuShown: false,
            layers: null,
        });

    }

    cancelLayerImport() {
        this.setState({
            importWizardShown: false,
            menuShown: true,
        })
    }

    /**
     * layerImportSubmit - Layer importing was completed -> draw to map
     *
     * @param  {ILayerData} layerData contains layer name and GeoJSON object
     */
    layerImportSubmit(layerData: ILayerData) {
        let layer;
        layerData.visOptions = this.defaultVisOptions;
        layerData.id = _currentLayerId;
        _currentLayerId++;
        if (layerData.layerType === LayerTypes.ChoroplethMap) {
            layer = this.createChoroplethLayer(layerData);
        }
        else if (layerData.layerType === LayerTypes.HeatMap) {
            layer = this.createHeatLayer(layerData);
        }
        else {
            layer = L.geoJson(layerData.geoJSON, {
                pointToLayer: layerData.visOptions.pointToLayer.bind(this),
                onEachFeature: layerData.visOptions.onEachFeature.bind(this),
            });
        }
        layerData.layer = layer;
        layer.addTo(_map);
        _map.fitBounds(layerData.layerType === LayerTypes.HeatMap ? (layer as any)._latlngs : layer.getBounds()); //leaflet.heat doesn't utilize getBounds, so get it directly

        var lyrs = this.state.layers ? this.state.layers : [];
        lyrs.push(layerData);
        this.setState({
            layers: lyrs,
            importWizardShown: false,
            menuShown: true,
        });
    }


    /**
     * changeLayerOrder - Redraws the layers in the order given
     *
     * @param   order   the array of layer ids
     */
    changeLayerOrder(order: number[]) {
        for (let i of order) {
            let layer = this.getLayerInfoById(i);
            if (layer.layer) {
                (layer.layer as any).bringToFront();
            }
        }
    }


    getLayerInfoById(id: number) {
        for (let lyr of this.state.layers) {
            if (lyr.id == id) {
                return lyr;
            }
        }
    }
    /**
     * refreshLayer - Update the layer on the map after the user has changed the visualization options
     * @param  layerData  The layer to update
     */
    refreshLayer(layerData: ILayerData) {
        if (layerData) {
            _map.removeLayer(layerData.layer);
            if (layerData.layerType !== LayerTypes.HeatMap) {
                layerData.visOptions.pointToLayer = (function(feature, latlng: L.LatLng) {
                    if (layerData.visOptions.symbolOptions.symbolType === SymbolTypes.Icon) {
                        let customIcon = L.AwesomeMarkers.icon({
                            icon: layerData.visOptions.symbolOptions.iconFA,
                            prefix: 'fa',
                            markerColor: 'red'
                        })
                        return L.marker(latlng, { icon: customIcon });
                    }
                    else if (layerData.visOptions.symbolOptions.symbolType === SymbolTypes.Rectangle) {
                        let vis = layerData.visOptions.colorOptions;
                        let sym = layerData.visOptions.symbolOptions;
                        let fillColor = vis.fillColor ? vis.fillColor : this.getChoroplethColor(vis.limits, vis.colors, feature.properties[vis.choroplethFieldName]);
                        let borderColor = vis.color;
                        let side: number = sym.sizeVariable ? GetSymbolRadius(feature.properties[sym.sizeVariable], sym.sizeMultiplier, sym.sizeLowerLimit, sym.sizeUpperLimit) : 10;
                        let html = '<div style="height: ' + side + 'px; width: ' + side + 'px; opacity:' + vis.opacity + '; background-color:' + fillColor + '; border: 1px solid ' + borderColor + '"/>';
                        let rectMarker = L.divIcon({ iconAnchor: L.point(feature.geometry[0], feature.geometry[1]), html: html, className: '' });
                        return L.marker(latlng, { icon: rectMarker });
                    }
                    else {
                        return L.circleMarker(latlng, layerData.visOptions.colorOptions);
                    }
                });
            }
            let layer;
            if (layerData.layerType === LayerTypes.ChoroplethMap || layerData.visOptions.colorOptions.choroplethFieldName !== '') {
                layer = this.createChoroplethLayer(layerData);
            }
            else if (layerData.layerType === LayerTypes.SymbolMap) {
                layer = L.geoJson(layerData.geoJSON, layerData.visOptions);
            }
            else if (layerData.layerType === LayerTypes.HeatMap) {
                console.log('heatenings')
                layer = this.createHeatLayer(layerData);
            }
            layer.addTo(_map);
            layerData.layer = layer;
            let layers = this.state.layers.filter((lyr) => { return lyr.id != layerData.id });
            if (layerData.layerType === LayerTypes.SymbolMap) {
                let opt = layerData.visOptions.symbolOptions;
                //if needs to scale and is of scalable type
                if (opt.sizeVariable && (opt.symbolType === SymbolTypes.Circle || opt.symbolType === SymbolTypes.Rectangle)) {
                    scaleSymbolLayerSize(opt);
                }
            }
            layers.push(layerData);
            this.setState({
                layers: layers,
            });
        }

        function scaleSymbolLayerSize(opt: ISymbolOptions) {
            (layerData.layer as any).eachLayer(function(layer) {
                let val = layer.feature.properties[opt.sizeVariable];
                let radius = 10;
                if (opt.sizeVariable) {
                    radius = GetSymbolRadius(val, opt.sizeMultiplier, opt.sizeLowerLimit, opt.sizeUpperLimit);
                    if (opt.symbolType === SymbolTypes.Circle) {
                        layer.setRadius(radius);
                    }
                    //calculate min and max values and -radii
                    if (!opt.actualMaxValue && !opt.actualMinValue) {
                        opt.actualMinValue = val;
                        opt.actualMaxValue = val;
                        opt.actualMaxRadius = radius;
                        opt.actualMinRadius = radius;
                    }
                    else {
                        if (val > opt.actualMaxValue) {
                            opt.actualMaxRadius = radius;
                            opt.actualMaxValue = val;
                        }
                        if (radius < opt.actualMinRadius) {
                            opt.actualMinRadius = radius;
                            opt.actualMinValue = val;
                        }

                    }
                }
            });
        }

    }



    /**
     * createChoroplethLayer - Create a new choropleth layer by leaflet-choropleth.js
     *
     * @param  layerData    the data containing the GeoJSON string and the color variable
     * @return {L.GeoJSON}  the GeoJSON layer coloured according to the visOptions
     */
    createChoroplethLayer(layerData: ILayerData) {
        let opts = layerData.visOptions.colorOptions;
        if (opts.choroplethFieldName === '') {
            layerData.headers.map(function(h) {
                if (h.type == 'number') {
                    opts.choroplethFieldName = h.label;
                }
            })
            if (opts.choroplethFieldName === '')
                opts.choroplethFieldName = layerData.headers[0].label;
        }
        let values = (layerData.geoJSON as any).features.map(function(item) {
            return item.properties[opts.choroplethFieldName];
        });

        opts.limits = chroma.limits(values, opts.mode, opts.steps);
        opts.colors = chroma.scale(opts.colorScheme).colors(opts.limits.length - 1);
        if (opts.revert) {
            opts.colors.reverse();
        }
        let style = function(feature) {

            return {
                fillOpacity: opts.fillOpacity,
                opacity: opts.opacity,
                fillColor: this.getChoroplethColor(opts.limits, opts.colors, feature.properties[opts.choroplethFieldName]),
                color: opts.color,
                weight: 1,
            }
        }

        let options: L.GeoJSONOptions = {
            pointToLayer: layerData.visOptions.pointToLayer.bind(this),
            onEachFeature: layerData.visOptions.onEachFeature ? layerData.visOptions.onEachFeature : this.defaultVisOptions.onEachFeature,
            style: style.bind(this),
        }

        return L.geoJson(layerData.geoJSON, options);
    }

    getChoroplethColor(limits: any[], colors: string[], value: number) {
        if (!isNaN(value)) {
            for (var i = 0; i < limits.length; i++) {
                if (value === limits[limits.length - 1]) { //color the last item correctly
                    return colors[colors.length - 1]
                }
                if (limits[i] <= value && value <= limits[i + 1]) {
                    return colors[i];
                }
            }
        }
    }


    createHeatLayer(layerData: ILayerData) {
        let arr: number[][] = [];
        let max = 0;
        layerData.geoJSON.features.map(function(feat) {
            let pos = [];

            let heatVal = feat.properties[layerData.heatMapVariable];
            if (heatVal > max)
                max = heatVal;
            pos.push(feat.geometry.coordinates[1]);
            pos.push(feat.geometry.coordinates[0]);
            if (layerData.heatMapVariable) { pos.push(heatVal / max) };
            arr.push(pos);
        });
        return L.heatLayer(arr, {})
    }

    /**
     * addPopupsToLayer - adds the feature details popup to layer
     *
     * @param   feature GeoJSON feature
     * @param   layer   layer to add popup to
     */
    addPopupsToLayer(feature, layer: L.GeoJSON) {
        var popupContent = '';
        for (var prop in feature.properties) {
            popupContent += prop + ": " + feature.properties[prop];
            popupContent += "<br />";
        }
        if (popupContent != '')
            layer.bindPopup(popupContent);
    }

    /**
     * addNewLayer - Opens the import wizard for  a new layer
     *
     */
    addNewLayer() {
        this.setState({
            importWizardShown: true,
            menuShown: false,
        });
    }

    /**
     * deleteLayer - Removes a layer from the map and layer list
     *
     * @param  id   The unique id of the LayerInfo to remove
     */
    deleteLayer(id: number) {
        let layerInfo = this.getLayerInfoById(id);
        if (layerInfo) {
            let currLayers = this.state.layers.filter((lyr) => { return lyr.id != id });
            _map.removeLayer(layerInfo.layer);
            this.setState({
                layers: currLayers,
                importWizardShown: false,
                menuShown: true,
            })
        }

    }


    /**
     * createFilterToLayer - Creates a new filter and calculates its values
     *
     * @param  info   The IFilter description of the new filter
     */
    createFilterToLayer(info: IFilter) {
        let maxVal, minVal;
        let filterValues: { [index: number]: L.ILayer[] } = {};
        let filters: { [title: string]: IFilter } = this.state.filters;
        if (info.layerData.layerType !== LayerTypes.HeatMap) {
            info.layerData.layer.eachLayer(function(layer) {
                let val = (layer as any).feature.properties[info.fieldToFilter];
                if (!minVal && !maxVal) { //initialize min and max values as the first value
                    minVal = val;
                    maxVal = val;
                }
                else {
                    if (val < minVal)
                        minVal = val;
                    if (val > maxVal)
                        maxVal = val;
                }
                if (filterValues[val])
                    filterValues[val].push(layer);
                else
                    filterValues[val] = [layer];
            });
        }
        //for heatmaps (and other non-layer types) only save the values from the GeoJSON object
        else {
            info.layerData.geoJSON.features.map(function(feat) {
                let val = feat.properties[info.fieldToFilter];
                if (!minVal && !maxVal) {
                    minVal = val;
                    maxVal = val;
                }
                else {
                    if (val < minVal)
                        minVal = val;
                    if (val > maxVal)
                        maxVal = val;
                }
            });
        }
        filters[info.title] = { id: _currentFilterId++, title: info.title, layerData: info.layerData, filterValues: filterValues, fieldToFilter: info.fieldToFilter, minValue: minVal, maxValue: maxVal };
        this.setState({
            filters: filters,
            importWizardShown: this.state.importWizardShown,
            menuShown: this.state.menuShown,
        })

    }


    /**
     * filterLayer - Remove or show items based on changes on a filter
     *
     * @param  title   The filter to change
     * @param  lowerLimit Current minimum value. Hide every value below this
     * @param  upperLimit Current max value. Hide every value above this
     */
    filterLayer(title: string, lowerLimit: any, upperLimit: any) {
        let filter = this.state.filters[title];
        if (filter.layerData.layerType !== LayerTypes.HeatMap) {
            for (let val in filter.filterValues) {
                if (val < lowerLimit || val > upperLimit) {
                    filter.filterValues[val].map(function(lyr) {
                        filter.layerData.layer.removeLayer(lyr);
                    });

                }
                else {
                    filter.filterValues[val].map(function(lyr) {
                        filter.layerData.layer.addLayer(lyr);
                    });
                }
            }
        }
        else {
            let arr: number[][] = [];
            filter.layerData.geoJSON.features.map(function(feat) {
                if (feat.properties[filter.fieldToFilter] > lowerLimit && feat.properties[filter.fieldToFilter] < upperLimit) {
                    let pos = [];
                    pos.push(feat.geometry.coordinates[1]);
                    pos.push(feat.geometry.coordinates[0]);
                    arr.push(pos);
                }
            });
            filter.layerData.layer.setLatLngs(arr);
        }
    }

    /**
     * getFilters - Gets the currently active filters for rendering
     *
     * @return  Filters in an array
     */
    getFilters() {
        let arr: JSX.Element[] = [];
        for (let key in this.state.filters) {
            arr.push(<Filter
                title={key}
                valueChanged={this.filterLayer.bind(this) }
                key={key} maxValue={this.state.filters[key].maxValue}
                minValue={this.state.filters[key].minValue}/>)
        }
        return arr;
    }


    legendPropsChanged(legend: ILegend) {
        this.setState({
            legend: legend,
            menuShown: this.state.menuShown,
            importWizardShown: this.state.importWizardShown,
        })
    }

    showLegend() {
        if (this.state.legend && this.state.legend.visible) {
            return <Legend
                title={this.state.legend.title}
                meta ={this.state.legend.meta}
                mapLayers={this.state.layers}
                horizontal={this.state.legend.horizontal}/>

        }
    }

    saveImage(options: IExportMenuStates) {
        function filter(node) {
            if (!node.className || !node.className.indexOf)
                return true;
            else
                return (node.className.indexOf('impromptu') === -1
                    && node.className.indexOf('leaflet-control') === -1
                    && (options.showLegend || (!options.showLegend && node.className.indexOf('legend') === -1))
                    && (options.showFilters || (!options.showFilters && node.className.indexOf('filter') === -1))
                );
        }
        domToImage.toBlob(document.getElementById('content'), { filter: filter })
            .then(function(blob) {
                (window as any).saveAs(blob, 'Mapify_map.png');
            });
    }
    render() {
        let modalStyle = {
            content: {
                border: '4px solid #6891e2',
                borderRadius: '15px',
                padding: '0px',
                maxWidth: 800,

            }
        }
        return (
            <div>
                <div id='map'/>
                <Modal
                    isOpen={this.state.importWizardShown}
                    style = {modalStyle}>
                    <LayerImportWizard
                        submit={this.layerImportSubmit.bind(this) }
                        cancel={this.cancelLayerImport.bind(this) }

                        />
                </Modal>
                <MapifyMenu
                    layers = {this.state.layers}
                    refreshMap={this.refreshLayer.bind(this) }
                    addLayer = {this.addNewLayer.bind(this) }
                    deleteLayer={this.deleteLayer.bind(this) }
                    createFilter ={this.createFilterToLayer.bind(this) }
                    changeLayerOrder ={this.changeLayerOrder.bind(this) }
                    legendStatusChanged = {this.legendPropsChanged.bind(this) }
                    visible={this.state.menuShown}
                    saveImage ={this.saveImage}
                    />
                {this.getFilters() }
                {this.showLegend() }
            </div>
        );
    }


};
var Map = MapMain;
ReactDOM.render(
    <Map/>, document.getElementById('content')
);
