import { ChartType } from "@ag-grid-community/core";
import { MiniChartWithAxes } from "./miniChartWithAxes";
import { linearScale, BandScale, Rect } from "ag-charts-community";

export class MiniColumn extends MiniChartWithAxes {

    static chartType = ChartType.GroupedColumn;

    private readonly bars: Rect[];

    constructor(container: HTMLElement, fills: string[], strokes: string[]) {
        super(container, "groupedColumnTooltip");

        const padding = this.padding;
        const size = this.size;
        const data = [2, 3, 4];

        const xScale = new BandScale<number>();
        xScale.domain = [0, 1, 2];
        xScale.range = [padding, size - padding];
        xScale.paddingInner = 0.3;
        xScale.paddingOuter = 0.3;

        const yScale = linearScale();
        yScale.domain = [0, 4];
        yScale.range = [size - padding, padding];

        const bottom = yScale.convert(0);
        const width = xScale.bandwidth;

        this.bars = data.map((datum, i) => {
            const top = yScale.convert(datum);
            const rect = new Rect();
            rect.x = xScale.convert(i);
            rect.y = top;
            rect.width = width;
            rect.height = bottom - top;
            rect.strokeWidth = 1;
            rect.crisp = true;

            return rect;
        });

        this.updateColors(fills, strokes);
        this.root.append(this.bars);
    }

    updateColors(fills: string[], strokes: string[]) {
        this.bars.forEach((bar, i) => {
            bar.fill = fills[i];
            bar.stroke = strokes[i];
        });
    }
}
