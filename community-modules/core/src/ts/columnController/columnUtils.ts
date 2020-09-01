import { GridOptionsWrapper } from '../gridOptionsWrapper';
import { ColumnGroupChild } from '../entities/columnGroupChild';
import { ColumnGroup } from '../entities/columnGroup';
import { OriginalColumnGroupChild } from '../entities/originalColumnGroupChild';
import { OriginalColumnGroup } from '../entities/originalColumnGroup';
import { Column } from '../entities/column';
import { Bean } from '../context/context';
import { Autowired } from '../context/context';
import { _ } from '../utils';
import { BeanStub } from '../context/beanStub';

/**
 * 表头列操作工具类，包括计算初始列宽，计算表头路径，基于深度优先执行callback。
 * 主要用来计算表头分组column groups。
 * takes in a list of columns, as specified by the column definitions, and returns column groups
 */
@Bean('columnUtils')
export class ColumnUtils extends BeanStub {
  @Autowired('gridOptionsWrapper')
  private gridOptionsWrapper: GridOptionsWrapper;

  public calculateColInitialWidth(colDef: any): number {
    const optionsWrapper = this.gridOptionsWrapper;
    const minColWidth =
      colDef.minWidth != null
        ? colDef.minWidth
        : optionsWrapper.getMinColWidth();
    const maxColWidth =
      colDef.maxWidth != null
        ? colDef.maxWidth
        : optionsWrapper.getMaxColWidth() || _.getMaxSafeInteger();
    const width =
      colDef.width != null ? colDef.width : optionsWrapper.getColWidth();

    return Math.max(Math.min(width, maxColWidth), minColWidth);
  }

  public getOriginalPathForColumn(
    column: Column,
    originalBalancedTree: OriginalColumnGroupChild[],
  ): OriginalColumnGroup[] {
    const result: OriginalColumnGroup[] = [];
    let found = false;

    const recursePath = (
      balancedColumnTree: OriginalColumnGroupChild[],
      dept: number,
    ): void => {
      for (let i = 0; i < balancedColumnTree.length; i++) {
        if (found) {
          return;
        }
        // quit the search, so 'result' is kept with the found result

        const node = balancedColumnTree[i];
        if (node instanceof OriginalColumnGroup) {
          const nextNode = node;
          recursePath(nextNode.getChildren(), dept + 1);
          result[dept] = node;
        } else if (node === column) {
          found = true;
        }
      }
    };

    recursePath(originalBalancedTree, 0);

    // we should always find the path, but in case there is a bug somewhere, returning null
    // will make it fail rather than provide a 'hard to track down' bug
    return found ? result : null;
  }

  /*    public getPathForColumn(column: Column, allDisplayedColumnGroups: ColumnGroupChild[]): ColumnGroup[] {
        let result: ColumnGroup[] = [];
        let found = false;

        recursePath(allDisplayedColumnGroups, 0);

        // we should always find the path, but in case there is a bug somewhere, returning null
        // will make it fail rather than provide a 'hard to track down' bug
        if (found) {
            return result;
        } else {
            return null;
        }

        function recursePath(balancedColumnTree: ColumnGroupChild[], dept: number): void {

            for (let i = 0; i<balancedColumnTree.length; i++) {
                if (found) {
                    // quit the search, so 'result' is kept with the found result
                    return;
                }
                let node = balancedColumnTree[i];
                if (node instanceof ColumnGroup) {
                    let nextNode = <ColumnGroup> node;
                    recursePath(nextNode.getChildren(), dept+1);
                    result[dept] = node;
                } else {
                    if (node === column) {
                        found = true;
                    }
                }
            }
        }
    }*/

  public depthFirstOriginalTreeSearch(
    parent: OriginalColumnGroup | null,
    tree: OriginalColumnGroupChild[],
    callback: (
      treeNode: OriginalColumnGroupChild,
      parent: OriginalColumnGroup,
    ) => void,
  ): void {
    if (!tree) {
      return;
    }

    tree.forEach((child: OriginalColumnGroupChild) => {
      if (child instanceof OriginalColumnGroup) {
        this.depthFirstOriginalTreeSearch(child, child.getChildren(), callback);
      }
      callback(child, parent);
    });
  }

  public depthFirstAllColumnTreeSearch(
    tree: ColumnGroupChild[] | null,
    callback: (treeNode: ColumnGroupChild) => void,
  ): void {
    if (!tree) {
      return;
    }

    tree.forEach((child: ColumnGroupChild) => {
      if (child instanceof ColumnGroup) {
        this.depthFirstAllColumnTreeSearch(child.getChildren(), callback);
      }
      callback(child);
    });
  }

  public depthFirstDisplayedColumnTreeSearch(
    tree: ColumnGroupChild[],
    callback: (treeNode: ColumnGroupChild) => void,
  ): void {
    if (!tree) {
      return;
    }

    tree.forEach((child: ColumnGroupChild) => {
      if (child instanceof ColumnGroup) {
        this.depthFirstDisplayedColumnTreeSearch(
          child.getDisplayedChildren(),
          callback,
        );
      }
      callback(child);
    });
  }
}
