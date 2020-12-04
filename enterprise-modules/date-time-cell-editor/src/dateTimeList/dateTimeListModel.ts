export interface IDateTimeListModel {
    getPage(base: Date, number: number): Page;
    roundToValue(date: Date): Date;
}

export interface Page {
    title: string;
    columns: Column[];
    entries: Entry[][];
}

export interface Column {
    label: string;
}

export interface Entry {
    label: string;
    value: Date;
    // true if this entry has been inserted as padding to make the grid structure
    // align correctly, but is not part of the time period for the page
    isPadding?: boolean;
}

export interface IDateTimeListModelOptions {
    // Given a point in time that falls within a period, return the first value
    // in the period. `offset` can be a positive or negative integer and is used
    // to request a period after or before the period containing `date`, for
    // example if showing a monthly calendar, if `date` is 5th July then the
    // return value should be 1st July if `offset` is 0, 1st August if `offset`
    // is 1, or 1st June if `offset` is -1.
    startOfPeriod(date: Date, offset: number): Date;

    // Given a point in time, return the value that contains it. Since values
    // are represented using their start time, this means rounding down to the
    // nearest value
    roundToValue(date: Date): Date;

    // given the start value in a period and an offset, return a value.  Offset
    // can a positive or negative integer and may fall outside the period itself
    // (e.g. when showing a monthly calendar, some days from the previous month
    // may be included if the month does not start on the first day of the
    // week).
    valueInPeriod(start: Date, offset: number): Date;

    // return the number of values in a period, not including padding before and
    // after.
    periodLength(start: Date): number;

    // return the label to show on a single entry within a period
    entryLabel(value: Date): string;

    // Given the first value in a period, return the number of columns required to render the period
    columnCount(first: Date): number;

    // Return the column that a value should be in, where 0 is the first column.
    // If numbers outside the range 0 - `columnCount` are returned they will be
    // wrapped into that range
    columnForValue(value: Date): number;

    // return the label to show on a single entry within a period
    columnTitle(value: Date): string;
}

const monthlyCalendarOptions: IDateTimeListModelOptions = {
    startOfPeriod(date, offset) {
        return new Date(date.getFullYear(), date.getMonth() + offset, 1);
    },
    roundToValue(date) {
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    },
    valueInPeriod(first, offset) {
        return new Date(first.getFullYear(), first.getMonth(), first.getDate() + offset);
    },
    periodLength(first) {
        const lastDayOfMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0);
        return lastDayOfMonth.getDate();
    },
    entryLabel(value) {
        return new Intl.DateTimeFormat('default', { day: 'numeric' }).format(value);
    },
    columnCount() {
        return 7;
    },
    columnForValue(value) {
        return (value.getDay() + 6) % 7;
    },
    columnTitle(value) {
        return new Intl.DateTimeFormat('default', { weekday: 'narrow' }).format(value);
    },
};

export class DateTimeListModel implements IDateTimeListModel {
    constructor(private options: IDateTimeListModelOptions = monthlyCalendarOptions) {}

    public getPage(date: Date, offset: number): Page {
        const { options } = this;

        const entries: Entry[] = [];
        const firstValue = options.startOfPeriod(date, offset);
        const columnCount = options.columnCount(firstValue);
        // TODO call columnForValue for every value and stack them into arbitrary columns
        const paddingAtStart = modulo(options.columnForValue(firstValue), columnCount); // adds padding at start
        const periodLength = options.periodLength(firstValue);
        const lastValue = options.valueInPeriod(firstValue, periodLength - 1);
        const itemsInLastColumn = modulo(options.columnForValue(lastValue), columnCount) + 1
        const paddingAtEnd = columnCount - itemsInLastColumn;
        const lastOffset = periodLength - 1 + paddingAtEnd;
        for (let i = -paddingAtStart; i <= lastOffset; i++) {
            const value = options.valueInPeriod(firstValue, i);
            entries.push({
                value,
                label: options.entryLabel(value),
                isPadding: i < 0 || i >= periodLength,
            });
        }

        const columns = Array(options.columnCount(firstValue))
            .fill(null)
            .map((_, i) => ({
                label: options.columnTitle(entries[i].value),
            }));

        const titleFormat = new Intl.DateTimeFormat('default', { month: 'long', year: 'numeric' });
        return {
            entries: splitArray(entries, columns.length),
            columns,
            title: titleFormat.format(firstValue),
        };
    }

    public roundToValue(date: Date) {
        return this.options.roundToValue(date);
    }
}

// modulo function that, unline the JS % operator, is safe for negative numbers
const modulo = (value: number, modulo: number) => ((value % modulo) + modulo) % modulo;


const splitArray = <T>(array: T[], chunkSize: number): T[][] => {
    const chunks: T[][] = [];
    array.forEach((value, i) => {
        const chunkIndex = Math.floor(i / chunkSize);
        chunks[chunkIndex] = chunks[chunkIndex] || [];
        chunks[chunkIndex].push(value);
    });
    return chunks;
};