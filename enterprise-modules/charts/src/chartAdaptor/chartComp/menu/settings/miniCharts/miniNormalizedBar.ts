import { ChartType } from "@ag-grid-community/core";
import { MiniStackedBar } from "./miniStackedBar";

export class MiniNormalizedBar extends MiniStackedBar {

    static chartType = ChartType.NormalizedBar;
    static data = [
        [10, 10, 10],
        [6, 7, 8],
        [2, 4, 6]
    ];

    constructor(container: HTMLElement, fills: string[], strokes: string[]) {
        super(container, fills, strokes, MiniNormalizedBar.data, [0, 10], "normalizedBarTooltip");
    }
}
