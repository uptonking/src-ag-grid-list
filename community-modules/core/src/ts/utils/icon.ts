import { GridOptionsWrapper } from '../gridOptionsWrapper';
import { Column } from '../entities/column';
import { loadTemplate, isNodeOrElement } from './dom';

//
// IMPORTANT NOTE!
//
// If you change the list below, copy/paste the new content into the docs page javascript-grid-icons
//
export const iconNameClassMap: { [key: string]: string } = {
  // header column group shown when expanded (click to contract)
  columnGroupOpened: 'expanded',
  // header column group shown when contracted (click to expand)
  columnGroupClosed: 'contracted',
  // tool panel column group contracted (click to expand)
  columnSelectClosed: 'tree-closed',
  // tool panel column group expanded (click to contract)
  columnSelectOpen: 'tree-open',
  // column tool panel header expand/collapse all button, shown when some children are expanded and
  //     others are collapsed
  columnSelectIndeterminate: 'tree-indeterminate',
  // shown on ghost icon while dragging column to the side of the grid to pin
  columnMovePin: 'pin',
  // shown on ghost icon while dragging over part of the page that is not a drop zone
  columnMoveHide: 'eye-slash',
  // shown on ghost icon while dragging columns to reorder
  columnMoveMove: 'arrows',
  // animating icon shown when dragging a column to the right of the grid causes horizontal scrolling
  columnMoveLeft: 'left',
  // animating icon shown when dragging a column to the left of the grid causes horizontal scrolling
  columnMoveRight: 'right',
  // shown on ghost icon while dragging over Row Groups drop zone
  columnMoveGroup: 'group',
  // shown on ghost icon while dragging over Values drop zone
  columnMoveValue: 'aggregation',
  // shown on ghost icon while dragging over pivot drop zone
  columnMovePivot: 'pivot',
  // shown on ghost icon while dragging over drop zone that doesn't support it, e.g.
  //     string column over aggregation drop zone
  dropNotAllowed: 'not-allowed',
  // shown on row group when contracted (click to expand)
  groupContracted: 'tree-closed',
  // shown on row group when expanded (click to contract)
  groupExpanded: 'tree-open',
  // context menu chart item
  chart: 'chart',
  // chart window title bar
  close: 'cross',
  // X (remove) on column 'pill' after adding it to a drop zone list
  cancel: 'cancel',
  // indicates the currently active pin state in the "Pin column" sub-menu of the column menu
  check: 'tick',
  // "go to first" button in pagination controls
  first: 'first',
  // "go to previous" button in pagination controls
  previous: 'previous',
  // "go to next" button in pagination controls
  next: 'next',
  // "go to last" button in pagination controls
  last: 'last',
  // shown on top right of chart when chart is linked to range data (click to unlink)
  linked: 'linked',
  // shown on top right of chart when chart is not linked to range data (click to link)
  unlinked: 'unlinked',
  // "Choose colour" button on chart settings tab
  colorPicker: 'color-picker',
  // rotating spinner shown by the loading cell renderer
  groupLoading: 'loading',
  // button to launch enterprise column menu
  menu: 'menu',
  // filter tool panel tab
  filter: 'filter',
  // column tool panel tab
  columns: 'columns',
  // button in chart regular size window title bar (click to maximise)
  maximize: 'maximize',
  // button in chart maximised window title bar (click to make regular size)
  minimize: 'minimize',
  // "Pin column" item in column header menu
  menuPin: 'pin',
  // "Value aggregation" column menu item (shown on numeric columns when grouping is active)"
  menuValue: 'aggregation',
  // "Group by {column-name}" item in column header menu
  menuAddRowGroup: 'group',
  // "Un-Group by {column-name}" item in column header menu
  menuRemoveRowGroup: 'group',
  // context menu copy item
  clipboardCopy: 'copy',
  // context menu paste item
  clipboardPaste: 'paste',
  // identifies the pivot drop zone
  pivotPanel: 'pivot',
  // "Row groups" drop zone in column tool panel
  rowGroupPanel: 'group',
  // columns tool panel Values drop zone
  valuePanel: 'aggregation',
  // drag handle used to pick up draggable columns
  columnDrag: 'grip',
  // drag handle used to pick up draggable rows
  rowDrag: 'grip',
  // context menu export item
  save: 'save',
  // icon on dropdown editors
  smallDown: 'small-down',
  // version of small-right used in RTL mode
  smallLeft: 'small-left',
  // separater between column 'pills' when you add multiple columns to the header drop zone
  smallRight: 'small-right',
  smallUp: 'small-up',
  // show on column header when column is sorted ascending
  sortAscending: 'asc',
  // show on column header when column is sorted descending
  sortDescending: 'desc',
  // show on column header when column has no sort, only when enabled with gridOptions.unSortIcon=true
  sortUnSort: 'none',
};

/**
 * If icon provided, use this (either a string, or a function callback).
 * if not, then use the default icon from the theme
 * @param {string} iconName
 * @param {GridOptionsWrapper} gridOptionsWrapper
 * @param {Column | null} [column]
 * @returns {HTMLElement}
 */
export function createIcon(
  iconName: string,
  gridOptionsWrapper: GridOptionsWrapper,
  column: Column | null,
): HTMLElement {
  const iconContents = createIconNoSpan(iconName, gridOptionsWrapper, column);

  if (iconContents.className.indexOf('ag-icon') > -1) {
    return iconContents;
  }

  const eResult = document.createElement('span');
  eResult.appendChild(iconContents);
  return eResult;
}

export function createIconNoSpan(
  iconName: string,
  gridOptionsWrapper: GridOptionsWrapper,
  column?: Column | null,
  forceCreate?: boolean,
): HTMLElement {
  let userProvidedIcon: Function | string | null = null;

  // check col for icon first
  const icons: any = column && column.getColDef().icons;

  if (icons) {
    userProvidedIcon = icons[iconName];
  }

  // if not in col, try grid options
  if (gridOptionsWrapper && !userProvidedIcon) {
    const optionsIcons = gridOptionsWrapper.getIcons();
    if (optionsIcons) {
      userProvidedIcon = optionsIcons[iconName];
    }
  }

  // now if user provided, use it
  if (userProvidedIcon) {
    let rendererResult: any;

    if (typeof userProvidedIcon === 'function') {
      rendererResult = userProvidedIcon();
    } else if (typeof userProvidedIcon === 'string') {
      rendererResult = userProvidedIcon;
    } else {
      throw new Error(
        'icon from grid options needs to be a string or a function',
      );
    }

    if (typeof rendererResult === 'string') {
      return loadTemplate(rendererResult);
    } else if (isNodeOrElement(rendererResult)) {
      return rendererResult;
    } else {
      console.warn(
        'ag-Grid: iconRenderer should return back a string or a dom object',
      );
    }
  } else {
    const span = document.createElement('span');
    let cssClass = iconNameClassMap[iconName];

    if (!cssClass) {
      if (!forceCreate) {
        console.warn(`ag-Grid: Did not find icon ${iconName}`);
        cssClass = '';
      } else {
        cssClass = iconName;
      }
    }

    span.setAttribute('class', 'ag-icon ag-icon-' + cssClass);
    span.setAttribute('unselectable', 'on');

    return span;
  }
}
