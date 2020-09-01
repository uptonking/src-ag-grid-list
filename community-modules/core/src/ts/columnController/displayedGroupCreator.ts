import { Autowired } from '../context/context';
import { ColumnUtils } from './columnUtils';
import { Column } from '../entities/column';
import { OriginalColumnGroupChild } from '../entities/originalColumnGroupChild';
import { GroupInstanceIdCreator } from './groupInstanceIdCreator';
import { ColumnGroupChild } from '../entities/columnGroupChild';
import { ColumnGroup } from '../entities/columnGroup';
import { OriginalColumnGroup } from '../entities/originalColumnGroup';
import { Bean } from '../context/context';
import { _ } from '../utils';
import { BeanStub } from '../context/beanStub';

/**
 * takes in a list of columns, as specified by the column definitions, and returns column groups。
 * 根据表头列定义，计算表头列分组。
 */
@Bean('displayedGroupCreator')
export class DisplayedGroupCreator extends BeanStub {
  @Autowired('columnUtils') private columnUtils: ColumnUtils;

  public createDisplayedGroups(
    // all displayed columns sorted - this is the columns the grid should show
    sortedVisibleColumns: Column[],
    // the tree of columns, as provided by the users, used to know what groups columns roll up into
    balancedColumnTree: OriginalColumnGroupChild[],
    // creates unique id's for the group
    groupInstanceIdCreator: GroupInstanceIdCreator,
    // whether it's left, right or center col
    pinned: 'left' | 'right' | null,
    // we try to reuse old groups if we can, to allow gui to do animation
    oldDisplayedGroups?: ColumnGroupChild[],
  ): ColumnGroupChild[] {
    const result: ColumnGroupChild[] = [];

    let previousRealPath: ColumnGroup[];
    let previousOriginalPath: OriginalColumnGroup[];

    const oldColumnsMapped = this.mapOldGroupsById(oldDisplayedGroups);

    // go through each column, then do a bottom up comparison to the previous column, and start
    // to share groups if they converge at any point.
    sortedVisibleColumns.forEach((currentColumn: Column) => {
      const currentOriginalPath = this.getOriginalPathForColumn(
        balancedColumnTree,
        currentColumn,
      );
      const currentRealPath: ColumnGroup[] = [];
      const firstColumn = !previousOriginalPath;

      for (let i = 0; i < currentOriginalPath.length; i++) {
        if (firstColumn || currentOriginalPath[i] !== previousOriginalPath[i]) {
          // new group needed
          const newGroup = this.createColumnGroup(
            currentOriginalPath[i],
            groupInstanceIdCreator,
            oldColumnsMapped,
            pinned,
          );

          currentRealPath[i] = newGroup;
          // if top level, add to result, otherwise add to parent
          if (i == 0) {
            result.push(newGroup);
          } else {
            currentRealPath[i - 1].addChild(newGroup);
          }
        } else {
          // reuse old group
          currentRealPath[i] = previousRealPath[i];
        }
      }

      const noColumnGroups = currentRealPath.length === 0;
      if (noColumnGroups) {
        // if we are not grouping, then the result of the above is an empty
        // path (no groups), and we just add the column to the root list.
        result.push(currentColumn);
      } else {
        const leafGroup = _.last(currentRealPath);
        leafGroup.addChild(currentColumn);
      }

      previousRealPath = currentRealPath;
      previousOriginalPath = currentOriginalPath;
    });

    this.setupParentsIntoColumns(result, null);

    return result;
  }

  private createColumnGroup(
    originalGroup: OriginalColumnGroup,
    groupInstanceIdCreator: GroupInstanceIdCreator,
    oldColumnsMapped: { [key: string]: ColumnGroup },
    pinned: 'left' | 'right',
  ): ColumnGroup {
    const groupId = originalGroup.getGroupId();
    const instanceId = groupInstanceIdCreator.getInstanceIdForKey(groupId);
    const uniqueId = ColumnGroup.createUniqueId(groupId, instanceId);

    let columnGroup = oldColumnsMapped[uniqueId];

    // if the user is setting new colDefs, it is possible that the id's overlap, and we
    // would have a false match from above. so we double check we are talking about the
    // same original column group.
    if (columnGroup && columnGroup.getOriginalColumnGroup() !== originalGroup) {
      columnGroup = null;
    }

    if (_.exists(columnGroup)) {
      // clean out the old column group here, as we will be adding children into it again
      columnGroup.reset();
    } else {
      columnGroup = new ColumnGroup(originalGroup, groupId, instanceId, pinned);
      this.context.createBean(columnGroup);
    }

    return columnGroup;
  }

  // returns back a 2d map of ColumnGroup as follows: groupId -> instanceId -> ColumnGroup
  private mapOldGroupsById(
    displayedGroups: ColumnGroupChild[],
  ): { [uniqueId: string]: ColumnGroup } {
    const result: { [uniqueId: string]: ColumnGroup } = {};

    const recursive = (columnsOrGroups: ColumnGroupChild[]) => {
      columnsOrGroups.forEach((columnOrGroup) => {
        if (columnOrGroup instanceof ColumnGroup) {
          const columnGroup = columnOrGroup;
          result[columnOrGroup.getUniqueId()] = columnGroup;
          recursive(columnGroup.getChildren());
        }
      });
    };

    if (displayedGroups) {
      recursive(displayedGroups);
    }

    return result;
  }

  private setupParentsIntoColumns(
    columnsOrGroups: ColumnGroupChild[],
    parent: ColumnGroup,
  ): void {
    columnsOrGroups.forEach((columnsOrGroup) => {
      columnsOrGroup.setParent(parent);
      if (columnsOrGroup instanceof ColumnGroup) {
        const columnGroup = columnsOrGroup;
        this.setupParentsIntoColumns(columnGroup.getChildren(), columnGroup);
      }
    });
  }

  private getOriginalPathForColumn(
    balancedColumnTree: OriginalColumnGroupChild[],
    column: Column,
  ): OriginalColumnGroup[] {
    const result: OriginalColumnGroup[] = [];
    let found = false;

    const recursePath = (
      balancedColumnTree: OriginalColumnGroupChild[],
      dept: number,
    ): void => {
      for (let i = 0; i < balancedColumnTree.length; i++) {
        // quit the search, so 'result' is kept with the found result
        if (found) {
          return;
        }

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

    recursePath(balancedColumnTree, 0);

    // it's possible we didn't find a path. this happens if the column is generated
    // by the grid (auto-group), in that the definition didn't come from the client. in this case,
    // we create a fake original path.
    if (found) {
      return result;
    }

    console.warn('could not get path');
    return null;
  }
}
