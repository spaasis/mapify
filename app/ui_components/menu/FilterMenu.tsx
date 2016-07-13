import * as React from 'react';
import {LayerTypes, SymbolTypes} from './../common_items/common';
let Select = require('react-select');
import {AppState} from '../Stores/States';
import {Filter} from '../Stores/Filter';
import {observer} from 'mobx-react';

@observer
export class FilterMenu extends React.Component<{
    state: AppState,
    /** adds the filter control to the map. Is triggered by button press. Returns the id of the created filter */
    addFilterToMap: () => number,
    /** Removes filter by specified id from the map */
    deleteFilter: (id: number) => void,
}, {}>{
    private activeLayer = this.props.state.editingLayer;

    onFilterVariableChange = (val) => {
        this.getMinMax(val.value)
        this.props.state.editingFilter.fieldToFilter = val.value;
        this.props.state.editingFilter.title = this.props.state.editingFilter.title ? this.props.state.editingFilter.title : val.value + '-filter';
    }
    onUseStepsChange = (e) => {
        this.props.state.filterMenuState.useCustomSteps = e.target.checked;
    }

    onUseDistinctValuesChange = (e) => {
        this.props.state.filterMenuState.useDistinctValues = e.target.checked;
        this.props.state.filterMenuState.customStepCount = this.getDistinctValues(this.props.state.editingFilter.fieldToFilter).length - 1;
    }
    getMinMax(field: string) {
        let minVal: number; let maxVal: number;
        this.props.state.editingLayer.geoJSON.features.map(function(feat) {
            let val = feat.properties[field];
            if (minVal === undefined && maxVal === undefined) {
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
        this.props.state.editingFilter.totalMin = minVal;
        this.props.state.editingFilter.totalMax = maxVal;
    }

    getDistinctValues(field: string) {
        let values: number[] = [];
        this.props.state.editingLayer.geoJSON.features.map(function(feat) {
            let val = feat.properties[field];
            if (values.indexOf(val) === -1)
                values.push(val)
        });

        return values.sort(function(a, b) { return a - b });
    }
    changeStepsCount(amount: number) {
        let newVal = this.props.state.filterMenuState.customStepCount + amount;
        if (newVal > 0) {
            this.props.state.filterMenuState.customStepCount = newVal;
        }
    }

    onFilterTitleChange = (e) => {
        this.props.state.editingFilter.title = e.target.value;
    }
    onFilterSelectChange = (id: ISelectData) => {
        this.props.state.filterMenuState.selectedFilterId = id.value;
        // this.props.state.editingFilter.titleTitle: this.props.filters.filter(function(f) { return f.id === id.value })[0].title
    }
    createNewFilter = () => {
        let filter = new Filter();
        filter.id = this.props.state.nextFilterId;
        filter.layerId = this.props.state.editingLayer.id;
        filter.title = this.props.state.editingLayer.layerName + '-filter';
        filter.fieldToFilter = this.props.state.editingLayer.numberHeaders[0].label;
        this.props.state.filters.push(filter);
        this.props.state.filterMenuState.selectedFilterId = filter.id;
    }
    saveFilter = () => {
        let steps;
        if (this.props.state.filterMenuState.useCustomSteps) {
            steps = this.getStepValues();
        }
        this.getMinMax(this.props.state.editingFilter.fieldToFilter);
        this.props.addFilterToMap();

    }
    deleteFilter() {
        this.props.deleteFilter(this.props.state.editingFilter.id);
        this.props.state.filterMenuState.selectedFilterId = - 1;
    }
    getStepValues() {
        let steps: [number, number][] = [];
        for (let i = 0; i < this.props.state.filterMenuState.customStepCount; i++) {
            let step: [number, number] = [+(document.getElementById(i + 'min') as any).value,
                +(document.getElementById(i + 'max') as any).value];
            steps.push(step)
        }
        return steps;
    }
    changeFilterMethod(remove: boolean) {
        this.props.state.editingFilter.remove = remove;
    }

    render() {
        let layer = this.props.state.editingLayer;
        let filter = this.props.state.editingFilter;
        let state = this.props.state.filterMenuState;
        let filters = [];
        for (let i in this.props.state.filters.slice()) {
            filters.push({ value: this.props.state.filters.slice()[i].id, label: this.props.state.filters.slice()[i].title });
        }
        return (!layer || this.props.state.visibleMenu !== 4 ? null :
            <div className="mapify-options">
                {filter ?
                    <div>
                        <label>Select the filter to update</label>
                        <Select
                            options={filters}
                            onChange={this.onFilterSelectChange }
                            value={state.selectedFilterId}
                            />
                        Or
                        <button onClick={this.createNewFilter }>Create new filter</button>
                        <label>Give a name to the filter</label>
                        <input type="text" onChange={this.onFilterTitleChange } value={filter ? filter.title : ''}/>
                        <div>
                            <label>Select the variable by which to filter</label>
                            <Select
                                options={layer.numberHeaders }
                                onChange={this.onFilterVariableChange }
                                value={filter ? filter.fieldToFilter : ''}
                                />
                        </div>
                        <label forHTML='steps'>
                            Use predefined steps
                            <input
                                type='checkbox'
                                onChange={this.onUseStepsChange }
                                checked={state.useCustomSteps}
                                id='steps'
                                />
                            <br/>
                        </label>
                        {state.useCustomSteps && filter.totalMin !== undefined && filter.totalMax !== undefined ?
                            <div>
                                <label forHTML='dist'>
                                    Use distinct values
                                    <input
                                        type='checkbox'
                                        onChange={this.onUseDistinctValuesChange }
                                        checked={state.useDistinctValues}
                                        id='dist'
                                        />
                                    <br/>
                                </label>
                                {renderSteps.call(this) }
                            </div>
                            : null}
                        {layer.layerType === LayerTypes.HeatMap ||
                            (layer.symbolOptions.symbolType === SymbolTypes.Icon ||
                                layer.symbolOptions.symbolType === SymbolTypes.Chart) ? null :
                            < div >
                                <label forHTML='remove'>
                                    Remove filtered items
                                    <input
                                        type='radio'
                                        onChange={this.changeFilterMethod.bind(this, true) }
                                        checked={filter.remove}
                                        name='filterMethod'
                                        id='remove'
                                        />
                                </label>
                                <br/>
                                Or
                                <br/>

                                <label forHTML='opacity'>
                                    Change opacity
                                    <input
                                        type='radio'
                                        onChange={this.changeFilterMethod.bind(this, false) }
                                        checked={!filter.remove}
                                        name='filterMethod'
                                        id='opacity'
                                        />

                                </label>
                            </div>
                        }
                        <button className='menuButton' onClick={this.saveFilter }>Save filter</button>
                        {filters.length > 0 && state.selectedFilterId !== -1 ?
                            <button className='menuButton' onClick={this.deleteFilter }>Delete filter</button>
                            : null}
                        <br/>
                        <i>TIP: drag the filter on screen by the header to place it where you wish</i>
                    </div>

                    :
                    <button onClick={this.createNewFilter }>Create new filter</button>
                }
            </div >
        );

        function renderSteps() {
            let rows = [];
            let inputStyle = {
                display: 'inline',
                width: 100
            }
            if (this.state.customSteps.length === 0) {
                let steps: [number, number][] = [];

                if (!this.state.useDistinctValues) {
                    for (let i = this.state.minVal; i < this.state.maxVal; i += (this.state.maxVal - this.state.minVal) / this.state.customStepCount) {
                        let step: [number, number] = [i, i + (this.state.maxVal - this.state.minVal) / this.state.customStepCount - 1];
                        steps.push(step);
                    }
                }
                else {
                    let values = this.getDistinctValues(this.state.selectedField);
                    for (let i = 0; i < values.length - 1; i++) {
                        let step: [number, number] = [values[i], values[i + 1] - 1];
                        steps.push(step);
                    }
                }
                let row = 0;
                for (let i of steps) {
                    rows.push(
                        <li key={i}>
                            <input
                                id={row + 'min'}
                                type='number'
                                defaultValue={i[0].toFixed(2) }
                                style={inputStyle}
                                step='any'/>
                            -
                            <input
                                id={row + 'max'}
                                type='number'
                                defaultValue={i[1].toFixed(2) }
                                style={inputStyle}
                                step='any'/>
                        </li>);
                    row++;
                }
            }
            return <div>
                <button onClick={this.changeStepsCount.bind(this, -1) }>-</button>
                <button onClick={this.changeStepsCount.bind(this, 1) }>+</button>
                <ul id='customSteps' style={{ listStyle: 'none', padding: 0 }}>{rows.map(function(r) { return r }) }</ul>
            </div>
        }
    }
}
