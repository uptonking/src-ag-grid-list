import {
    _,
    AgColorPicker,
    AgGroupComponent,
    AgSelect,
    Autowired,
    Component,
    FontStyle,
    FontWeight,
    PostConstruct,
    RefSelector,
    AgGroupComponentParams
} from "@ag-grid-community/core";
import { ChartTranslator } from "../../chartTranslator";

export type Font = {
    family?: string;
    style?: FontStyle;
    weight?: FontWeight;
    size?: number;
    color?: string;
};

export interface FontPanelParams {
    name?: string;
    enabled: boolean;
    suppressEnabledCheckbox?: boolean;
    setEnabled?: (enabled: boolean) => void;
    initialFont: Font;
    setFont: (font: Font) => void;
}

export class FontPanel extends Component {

    public static TEMPLATE = /* html */
        `<div class="ag-font-panel">
            <ag-group-component ref="fontGroup">
                <ag-select ref="familySelect"></ag-select>
                <ag-select ref="weightStyleSelect"></ag-select>
                <div class="ag-charts-font-size-color">
                    <ag-select ref="sizeSelect"></ag-select>
                    <ag-color-picker ref="colorPicker"></ag-color-picker>
                </div>
            </ag-group-component>
        </div>`;

    @RefSelector('fontGroup') private fontGroup: AgGroupComponent;
    @RefSelector('familySelect') private familySelect: AgSelect;
    @RefSelector('weightStyleSelect') private weightStyleSelect: AgSelect;
    @RefSelector('sizeSelect') private sizeSelect: AgSelect;
    @RefSelector('colorPicker') private colorPicker: AgColorPicker;

    @Autowired('chartTranslator') private chartTranslator: ChartTranslator;

    private params: FontPanelParams;
    private activeComps: Component[] = [];

    constructor(params: FontPanelParams) {
        super();
        this.params = params;
    }

    @PostConstruct
    private init() {
        const groupParams: AgGroupComponentParams = {
            cssIdentifier: 'charts-format-sub-level',
            direction: 'vertical',
            suppressOpenCloseIcons: true
        };
        this.setTemplate(FontPanel.TEMPLATE, {fontGroup: groupParams});

        this.initGroup();
        this.initFontFamilySelect();
        this.initFontWeightStyleSelect();
        this.initFontSizeSelect();
        this.initFontColorPicker();
    }

    public addCompToPanel(comp: Component) {
        this.fontGroup.addItem(comp);
        this.activeComps.push(comp);
    }

    public setEnabled(enabled: boolean): void {
        this.fontGroup.setEnabled(enabled);
    }

    private initGroup() {
        this.fontGroup
            .setTitle(this.params.name || this.chartTranslator.translate('font'))
            .setEnabled(this.params.enabled)
            .hideEnabledCheckbox(!!this.params.suppressEnabledCheckbox)
            .hideOpenCloseIcons(true)
            .onEnableChange(enabled => {
                if (this.params.setEnabled) {
                    this.params.setEnabled(enabled);
                }
            });
    }

    private initFontFamilySelect() {
        const families = [
            'Arial, sans-serif',
            'Aria Black, sans-serif',
            'Book Antiqua,  serif',
            'Charcoal, sans-serif',
            'Comic Sans MS, cursive',
            'Courier, monospace',
            'Courier New, monospace',
            'Gadget, sans-serif',
            'Geneva, sans-serif',
            'Helvetica, sans-serif',
            'Impact, sans-serif',
            'Lucida Console, monospace',
            'Lucida Grande, sans-serif',
            'Lucida Sans Unicode,  sans-serif',
            'Monaco, monospace',
            'Palatino Linotype, serif',
            'Palatino, serif',
            'Times New Roman, serif',
            'Times, serif',
            'Verdana, sans-serif'
        ];

        const { family } = this.params.initialFont;
        let initialValue = families[0];

        if (family) {
            // check for known values using lowercase
            const lowerCaseValues = families.map(f => f.toLowerCase());
            const valueIndex = lowerCaseValues.indexOf(family.toLowerCase());

            if (valueIndex >= 0) {
                initialValue = families[valueIndex];
            } else {
                // add user provided value to list
                const capitalisedFontValue = _.capitalise(family);

                families.push(capitalisedFontValue);

                initialValue = capitalisedFontValue;
            }
        }

        const options = families.sort().map(value => ({ value, text: value }));

        this.familySelect.addOptions(options)
            .setInputWidth('flex')
            .setValue(`${initialValue}`)
            .onValueChange(newValue => this.params.setFont({ family: newValue }));
    }

    private initFontSizeSelect() {
        const sizes = [8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36];
        const { size } = this.params.initialFont;

        if (!_.includes(sizes, size)) {
            sizes.push(size);
        }

        const options = sizes.sort((a, b) => a - b).map(value => ({ value: `${value}`, text: `${value}` }));

        this.sizeSelect.addOptions(options)
            .setInputWidth('flex')
            .setValue(`${size}`)
            .onValueChange(newValue => this.params.setFont({ size: parseInt(newValue, 10) }));

        this.sizeSelect.setLabel(this.chartTranslator.translate('size'));
    }

    private initFontWeightStyleSelect() {
        const { weight = 'normal', style = 'normal' } = this.params.initialFont;

        const weightStyles: { name: string, weight: FontWeight, style: FontStyle }[] = [
            { name: 'normal', weight: 'normal', style: 'normal' },
            { name: 'bold', weight: 'bold', style: 'normal' },
            { name: 'italic', weight: 'normal', style: 'italic' },
            { name: 'boldItalic', weight: 'bold', style: 'italic' }
        ];

        let selectedOption = _.find(weightStyles, x => x.weight === weight && x.style === style);

        if (!selectedOption) {
            selectedOption = { name: 'predefined', weight, style };
            weightStyles.unshift(selectedOption);
        }

        const options = weightStyles.map(ws => ({
            value: ws.name,
            text: this.chartTranslator.translate(ws.name),
        }));

        this.weightStyleSelect.addOptions(options)
            .setInputWidth('flex')
            .setValue(selectedOption.name)
            .onValueChange(newValue => {
                const selectedWeightStyle = _.find(weightStyles, x => x.name === newValue);

                this.params.setFont({ weight: selectedWeightStyle.weight, style: selectedWeightStyle.style });
            });
    }

    private initFontColorPicker() {
        this.colorPicker
            .setLabel(this.chartTranslator.translate('color'))
            .setInputWidth(45)
            .setValue(`${this.params.initialFont.color}`)
            .onValueChange(newColor => this.params.setFont({ color: newColor }));
    }

    private destroyActiveComps(): void {
        this.activeComps.forEach(comp => {
            _.removeFromParent(comp.getGui());
            this.destroyBean(comp);
        });
    }

    protected destroy(): void {
        this.destroyActiveComps();
        super.destroy();
    }
}
