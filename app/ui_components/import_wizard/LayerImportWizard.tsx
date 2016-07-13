import * as React from 'react';

import {LayerTypeSelectView} from './LayerTypeSelectView';
import {FileUploadView} from './FileUploadView';
import {FileDetailsView} from './FileDetailsView';
import {FilePreProcessModel} from '../../models/FilePreProcessModel';
import {LayerTypes} from "../common_items/common";

let _fileModel = new FilePreProcessModel();

import {ImportWizardState} from '../Stores/States';
import {observer} from 'mobx-react';

@observer
export class LayerImportWizard extends React.Component<{
    state: ImportWizardState,
    map: L.Map,
    /** Function to upload the data to the map */
    submit: (Layer) => void,
    /** Function to signal the cancellation of the import.  */
    cancel: () => void,
}, {}>{
    nextStep() {
        this.props.state.step++;
    }

    previousStep() {
        this.props.state.step--;
    }

    setFileInfo() {
        let state = this.props.state;
        let ext = state.fileExtension;
        if (ext === 'csv') {
            this.nextStep();
        }
        else {
            if (ext === 'geojson')
                state.layer.geoJSON = JSON.parse(state.content);
            else if (ext === 'kml' || ext === 'gpx' || ext === 'wkt')
                state.layer.geoJSON = _fileModel.ParseToGeoJSON(state.content, ext)
            let props = state.layer.geoJSON.features ? state.layer.geoJSON.features[0].properties : {};
            for (let h of Object.keys(props)) {
                state.layer.headers.push({ value: h, label: h, type: isNaN(parseFloat(props[h])) ? 'string' : 'number' });
            }
            this.nextStep();
        }
    }

    setFileDetails(fileDetails) {
        let details = this.props.state;

        details.latitudeField = fileDetails.latitudeField;
        details.longitudeField = fileDetails.longitudeField;
        details.coordinateSystem = fileDetails.coordinateSystem;
        this.submit();
    }

    setLayerName(name: string) {
        this.props.state.layer.layerName = name;
    }
    cancel() {
        this.props.cancel();
    }
    /**
     * submit - Parse given data to GeoJSON and pass to Map
     *
     * @return {void}
     */
    submit() {
        let state = this.props.state;

        if (!state.layer.geoJSON && state.fileExtension === 'csv') {
            state.layer.geoJSON = _fileModel.ParseCSVToGeoJSON(state.content,
                state.latitudeField,
                state.longitudeField,
                state.delimiter,
                state.coordinateSystem,
                state.layer.headers);

            state.layer.headers = state.layer.headers.filter(function(val) { return val.label !== state.longitudeField && val.label !== state.latitudeField });

        }

        else if (state.coordinateSystem && state.coordinateSystem !== 'WGS84') {
            state.layer.geoJSON = _fileModel.ProjectCoords(state.layer.geoJSON, state.coordinateSystem);
        }
        this.props.submit(state.layer);
    }
    getCurrentView() {
        switch (this.props.state.step) {
            case 0:
                return <div style={{ minWidth: 1000 }}>
                    <LayerTypeSelectView
                        state = {this.props.state}
                        map= {this.props.map}
                        cancel = {this.cancel.bind(this) }
                        />
                </div>
            case 1:
                return <FileUploadView
                    state={this.props.state}
                    saveValues={this.setFileInfo.bind(this) }
                    goBack={this.previousStep.bind(this) }
                    />
            case 2:
                return <FileDetailsView
                    state={this.props.state}
                    saveValues={this.setFileDetails.bind(this) }
                    goBack = {this.previousStep.bind(this) }
                    />
        }
    }
    render() {
        return (
            <div style ={{ overflowX: 'auto' }}>
                { this.getCurrentView() }
            </div>
        )
    }
}
