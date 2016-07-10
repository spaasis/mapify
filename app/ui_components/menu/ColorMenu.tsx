import * as React from 'react';
let Select = require('react-select');
let ColorPicker = require('react-color');
import {ColorScheme} from './ColorScheme';
let Modal = require('react-modal');
let chroma = require('chroma-js');
import {AppState, Layer, ColorOptions} from '../Stores';
import {observer} from 'mobx-react';

@observer
export class ColorMenu extends React.Component<{
    state: AppState,
    visible: boolean,
    /** Save the current options to the layer*/
    saveValues: (values: ColorOptions) => void,
    /** layer being edited*/
}, {}>{

    private activeLayer = this.props.state.editingLayer;
    private colorOptions = this.activeLayer.visOptions.colorOptions;
    private UIState = this.props.state.colorMenuState;
    // getPreviousOptions(prev: IColorOptions, initial: boolean) {
    //     let state: IColorMenuStates = {
    //         fillColor: prev.fillColor ? prev.fillColor : '#E0E62D',
    //         iconTextColor: prev.iconTextColor ? prev.iconTextColor : '#FFF',
    //         borderColor: prev.color ? prev.color : '#000',
    //         opacity: prev.opacity ? prev.opacity : 0.8,
    //         choroplethField: prev.choroplethField ? prev.choroplethField : '',
    //         colorScheme: prev.colorScheme ? prev.colorScheme : 'Greys',
    //         useMultipleFillColors: (prev.choroplethField || this.props.isChoropleth) ? true : false,
    //         revertColorScheme: prev.revert ? prev.revert : false,
    //         steps: prev.steps ? prev.steps : 7,
    //         mode: prev.mode ? prev.mode : 'q',
    //         useCustomScheme: prev.useCustomScheme ? prev.useCustomScheme : false,
    //         colors: prev.colors ? prev.colors : [],
    //         limits: prev.limits ? prev.limits : [],
    //     };
    //     initial ? this.state = state : this.setState(state)
    // }
    // componentWillReceiveProps(nextProps: IColorMenuProps) {
    //     this.getPreviousOptions(nextProps.prevOptions, false);
    //
    // }

    colorSelect(color) {
        let hex = '#' + color.hex;
        let step = this.UIState.editing.indexOf('step') !== -1 ? this.UIState.editing.substring(4) : -1;//Check if editing a custom made step, get step index
        if (step != -1)
            this.colorOptions.colors[step] = hex;


        switch (this.UIState.editing) {
            case 'fillColor':
                this.colorOptions.fillColor = hex;
                break;
            case 'borderColor':
                this.colorOptions.color = hex;
                break;
            case 'iconTextColor':
                this.colorOptions.iconTextColor = hex;
                break;
        }

    }
    onChoroVariableChange = (e) => {
        this.colorOptions.choroplethField = e.name;
        this.calculateValues();
    }
    onSchemeChange = (e) => {
        this.colorOptions.colorScheme = e.value;
        this.calculateValues();
    }
    onOpacityChange = (e) => {
        this.colorOptions.opacity = e.target.valueAsNumber;
    }
    onStepsChange = (e) => {
        this.colorOptions.steps = e.target.valueAsNumber;
        this.calculateValues();
    }
    onModeChange = (mode) => {
        this.colorOptions.mode = mode;
        this.calculateValues();

    }
    onMultipleColorsChange = (e) => {
        this.UIState.useMultipleFillColors = e.target.checked;
    }
    onRevertChange = (e) => {

        this.colorOptions.revert = e.target.checked,
            this.calculateValues();

    }
    onCustomSchemeChange = (e) => {
        let use: boolean = e.target.checked;
        let steps: number = use ? this.colorOptions.steps : this.colorOptions.steps > 10 ? 10 : this.colorOptions.steps; //If switching back from custom steps, force the steps to be under the limit

        this.colorOptions.useCustomScheme = use;
        this.colorOptions.steps = steps;
        this.calculateValues();
    }
    toggleColorPick = (property: string) => {

        this.UIState.colorSelectOpen = this.UIState.editing !== property ? true : !this.UIState.colorSelectOpen;
        this.UIState.editing = property;
    }
    renderScheme = (option: IHeader) => {
        return <ColorScheme gradientName={option.value} revert={this.colorOptions.revert}/>;
    }

    /**
     * calculateValues - Performs the chroma-js calculation to get colors and steps
     */
    calculateValues = () => {
        let lyr: Layer = this.activeLayer;
        let choroField = this.colorOptions.choroplethField;
        let values = (lyr.geoJSON as any).features.map(function(feat) {
            return feat.properties[choroField];
        });
        let limits: number[] = chroma.limits(values, this.colorOptions.mode, this.colorOptions.steps);
        let colors: string[] = chroma.scale(this.colorOptions.colorScheme).colors(limits.length - 1);

        this.colorOptions.limits = limits;
        this.colorOptions.colors = this.colorOptions.revert ? colors.reverse() : colors;
    }

    /**
     * getOppositeColor - Returns a near-opposite color to the one given
     *
     * @param   color Color(hex) to compare
     * @return  Opposite color code(hex)
     */
    getOppositeColor = (color: string) => {
        if (color.toLowerCase() === '#fff' || color === '#ffffff' || color === 'white') {
            return '#000';
        }
        else if (color.toLowerCase() === '#000' || color === '#000000' || color === 'black') {
            return '#FFF'
        }
        return '#' + ('000000' + ((0xffffff ^ parseInt(color.substr(1), 16)).toString(16))).slice(-6);

    }

    getStepValues = () => {
        if (!this.UIState.useMultipleFillColors)
            return [];
        let limits: number[] = [];
        for (let i = 0; i < this.colorOptions.steps; i++) {
            let step: number = +(document.getElementById(i + 'min') as any).value
            limits.push(step)
        }
        limits.push(this.colorOptions.limits[this.colorOptions.limits.length - 1]);
        return limits;
    }
    saveOptions = () => {
        // this.props.saveValues({
        //     choroplethField: this.colorOptions.useMultipleFillColors ? this.colorOptions.choroplethField : '',
        //     steps: this.colorOptions.steps,
        //     colorScheme: this.colorOptions.useMultipleFillColors ? this.colorOptions.colorScheme : '',
        //     mode: this.colorOptions.mode,
        //     fillOpacity: this.colorOptions.opacity,
        //     opacity: this.colorOptions.opacity,
        //     fillColor: this.colorOptions.useMultipleFillColors ? '' : this.colorOptions.fillColor,
        //     iconTextColor: this.colorOptions.iconTextColor,
        //     color: this.colorOptions.borderColor,
        //     revert: this.colorOptions.revertColorScheme,
        //     limits: this.colorOptions.useCustomScheme ? this.getStepValues() : this.colorOptions.limits,
        //     colors: this.colorOptions.useMultipleFillColors ? this.colorOptions.colors : [],
        //     useCustomScheme: this.colorOptions.useCustomScheme,
        // });
    }
    renderSteps() {
        let rows = [];
        let steps: number[] = [];
        for (let i in this.colorOptions.limits) {
            if (+i !== this.colorOptions.limits.length - 1) {
                let step: number = this.colorOptions.limits[i];
                steps.push(step);
            }
        }
        let row = 0;
        for (let i of steps) {
            rows.push(
                <li key={i}
                    style={{ background: this.colorOptions.colors[row] ? this.colorOptions.colors[row] : '#FFF', }}
                    onClick={this.toggleColorPick.bind(this, 'step' + row) }>
                    <input
                        id={row + 'min'}
                        type='number'
                        defaultValue={i.toFixed(2) }
                        style={{
                            width: 100,

                        }}
                        onClick={function(e) { e.stopPropagation(); } }
                        step='any'/>
                </li>);
            row++;
        }
        return <div>
            <ul id='customSteps' style={{ listStyle: 'none', padding: 0 }}>{rows.map(function(r) { return r }) }</ul>
        </div>
    }
    render() {
        let fillColorBlockStyle = {
            background: this.colorOptions.fillColor,
            color: this.getOppositeColor(this.colorOptions.fillColor),
            border: '1px solid ' + this.colorOptions.color,
        }
        let borderColorBlockStyle = {
            background: this.colorOptions.color,
            color: this.getOppositeColor(this.colorOptions.color),
            border: '1px solid ' + this.colorOptions.color,
        }
        let iconTextColorBlockStyle = {

            background: this.colorOptions.iconTextColor,
            color: this.getOppositeColor(this.colorOptions.iconTextColor),
            border: '1px solid ' + this.colorOptions.color,
        }
        let colorSelectStyle = {
            overlay: {
                position: 'fixed',
                height: 600,
                width: 300,
                right: 230,
                bottom: '',
                top: 20,
                left: '',
                backgroundColor: ''

            },
            content: {
                border: '4px solid #6891e2',
                borderRadius: '15px',
                padding: '0px',
                height: 650,
                width: 300,
                right: '',
                bottom: '',
                top: '',
                left: '',
            }
        }
        return (!this.props.visible ? null :
            <div className="mapify-options">
                {this.props.state.editingLayer.visOptions.colorOptions.choroplethField != '' ? null :
                    <div>
                        <label htmlFor='multipleSelect'>Use multiple fill colors</label>
                        <input id='multipleSelect' type='checkbox' onChange={this.onMultipleColorsChange } checked={this.UIState.useMultipleFillColors}/>
                    </div>
                }
                <div style={{ display: 'flex', flexDirection: 'row' }}>
                    {this.UIState.useMultipleFillColors ?
                        null :
                        <div className='colorBlock' style={fillColorBlockStyle} onClick={this.toggleColorPick.bind(this, 'fillColor') }>Fill</div>
                    }
                    <div className='colorBlock' style={borderColorBlockStyle} onClick={this.toggleColorPick.bind(this, 'borderColor') }>Border</div>
                    {this.props.state.editingLayer.visOptions.symbolOptions.iconField != '' ?
                        <div className='colorBlock' style={iconTextColorBlockStyle} onClick={this.toggleColorPick.bind(this, 'iconTextColor') }>Icon text</div>
                        : null
                    }

                </div>
                <label>Opacity</label>
                <input type='number' max={1} min={0} step={0.1} onChange={this.onOpacityChange } value={this.colorOptions.opacity}/>

                <Modal
                    isOpen={this.UIState.colorSelectOpen}
                    style={colorSelectStyle}
                    >

                    <ColorPicker.SwatchesPicker
                        width={300}
                        height={600}
                        overlowY='auto'
                        color={ this.UIState.startColor}
                        onChange={this.colorSelect }
                        />
                    <button
                        className='primaryButton'
                        onClick={this.toggleColorPick.bind(this, this.UIState.editing) }
                        style={{ position: 'absolute', left: 80 }}>OK</button>
                </Modal>
                {
                    this.UIState.useMultipleFillColors ?
                        <div>
                            <label>Select the variable to color by</label>
                            <Select
                                options={this.activeLayer.numberHeaders}
                                onChange={this.onChoroVariableChange }
                                value={this.colorOptions.choroplethField}
                                clearable={false}
                                />
                            {this.colorOptions.choroplethField ?

                                <div>
                                    <label htmlFor='customScale'>Set custom scheme</label>
                                    <input
                                        id='customScale'
                                        type='checkbox'
                                        onChange={this.onCustomSchemeChange }
                                        checked={this.colorOptions.useCustomScheme}/>
                                    <br/>
                                    {this.colorOptions.useCustomScheme ?
                                        null :
                                        <div>
                                            Or
                                            <br/>
                                            <label>Select a color scheme</label>
                                            <Select
                                                clearable = {false}
                                                searchable = {false}
                                                options = {_gradientOptions}
                                                optionRenderer={this.renderScheme }
                                                valueRenderer = {this.renderScheme }
                                                onChange={this.onSchemeChange }
                                                value={this.colorOptions.colorScheme}
                                                />
                                            <label htmlFor='revertSelect'>Revert</label>
                                            <input
                                                id='revertSelect'
                                                type='checkbox'
                                                onChange={this.onRevertChange }
                                                checked={this.colorOptions.revert}/>
                                        </div>
                                    }
                                    <label>Steps</label>
                                    <input
                                        type='number'
                                        max={this.colorOptions.useCustomScheme ? 100 : 10}
                                        min={2}
                                        step={1}
                                        onChange={this.onStepsChange }
                                        value={this.colorOptions.steps}/>
                                    {this.colorOptions.useCustomScheme ?
                                        <div>
                                            Set the <i>lower limit</i> for each step and a color to match
                                            {this.renderSteps() }
                                        </div>
                                        :
                                        <div>
                                            <label forHTML='quantiles'>
                                                Quantiles
                                                <input
                                                    type='radio'
                                                    onChange={this.onModeChange.bind(this, 'q') }
                                                    checked={this.colorOptions.mode === 'q'}
                                                    name='mode'
                                                    id='quantiles'
                                                    />
                                                <br/>
                                            </label>
                                            <label forHTML='kmeans'>
                                                K-means
                                                <input
                                                    type='radio'
                                                    onChange={this.onModeChange.bind(this, 'k') }
                                                    checked={this.colorOptions.mode === 'k'}
                                                    name='mode'
                                                    id='kmeans'
                                                    />
                                                <br/>

                                            </label>
                                            <label forHTML='equidistant'>
                                                Equidistant
                                                <input
                                                    type='radio'
                                                    onChange={this.onModeChange.bind(this, 'e') }
                                                    checked={this.colorOptions.mode === 'e'}
                                                    name='mode'
                                                    id='equidistant'
                                                    />
                                                <br/>

                                            </label>
                                        </div>
                                    }
                                </div>
                                : null}
                        </div>
                        : null
                }
                <button className='menuButton' onClick={this.saveOptions }>Refresh map</button>
            </div >
        );
    }

}
const _gradientOptions: { value: string }[] =
    [
        { value: 'Greys' },
        { value: 'Reds' },
        { value: 'Blues' },
        { value: 'Greens' },
        { value: 'BuGn' },
        { value: 'OrRd' },
        { value: 'YlOrRd' },
        { value: 'YlOrBr' },
        { value: 'RdPu' },
        { value: 'PuBu' },
        { value: 'YlGn' },
        { value: 'YlGnBu' },
        { value: 'PuBuGn' },
        { value: 'Spectral' },
        { value: 'RdYlGn' },
        { value: 'RdYlBu' },
        { value: 'RdBu' },
        { value: 'PiYG' },
        { value: 'PRGn' },
        { value: 'BrBG' },
        //{ value: 'RdGy' },
        //{ value: 'Set1' },
        { value: 'Set2' },
        //{ value: 'Set3' },
        //{ value: 'Accent' },
        { value: 'Dark2' },
        { value: 'Paired' },
        //{ value: 'Pastel1' },
        //{ value: 'Pastel2' }



    ];
