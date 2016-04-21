import * as React from 'react';
let Select = require('react-select');
import {ColorScheme} from './ColorScheme';
const _gradientOptions: { value: string, label: string }[] =
    [
        { value: 'Greys', label: 'Greys' },
        { value: 'Reds', label: 'Reds' },
        { value: 'Blues', label: 'Blues' },
        { value: 'Greens', label: 'Greens' },
        { value: 'OrRd', label: 'OrRd' },
        { value: 'YlOrRd', label: 'YlOrRd' },
        { value: 'RdPu', label: 'RdPu' },
        { value: 'PuRd', label: 'PuRd' },
        { value: 'PuBu', label: 'PuBu' },
        { value: 'YlGnBu', label: 'YlGnBu' },
    ];


export class ColorMenu extends React.Component<IColorMenuProps, IColorMenuStates>{
    constructor(props: IColorMenuProps) {
        super(props);
        let prev = this.props.prevOptions;

        this.state =
            {
                propertyVar: prev && prev.choroplethOptions ? prev.choroplethOptions.valueProperty : '',
                choroplethGradientName: prev && prev.choroplethOptions ? prev.choroplethOptions.scale : ''
            };
    }
    shouldComponentUpdate(nextProps: IColorMenuProps, nextState: IColorMenuStates) {
        return nextProps.isVisible !== this.props.isVisible ||
            nextProps.prevOptions !== this.props.prevOptions ||
            nextState.propertyVar !== this.state.propertyVar ||
            nextState.choroplethGradientName !== this.state.choroplethGradientName;
    }
    variableChanged(val) {
        this.setState({
            propertyVar: val.value
        });
    }
    schemeChanged(val) {
        this.setState({
            choroplethGradientName: val.label
        });
    }
    renderOption(option) {
        return <ColorScheme gradientName={option.label} steps = {100} />;
    }
    saveOptions() {

        this.props.saveValues({
            choroplethOptions: {
                valueProperty: this.state.propertyVar,
                steps: 7,
                scale: this.state.choroplethGradientName,
                mode: 'q'

            },
        });
    }
    render() {
        return (!this.props.isVisible ? null :
            <div className="mapify-options">
                <h4>Select the variable to color by</h4>
                <Select
                    options={this.props.headers}
                    onChange={this.variableChanged.bind(this) }
                    value={this.state.propertyVar}
                    />
                <h4>Select the color scale</h4>
                <Select
                    options = {_gradientOptions}
                    optionRenderer={this.renderOption}
                    valueRenderer = {this.renderOption}
                    onChange={this.schemeChanged.bind(this) }
                    value={this.state.choroplethGradientName}
                    />
                <button onClick={this.saveOptions.bind(this) }>Refresh map</button>
            </div>
        );
    }

}
