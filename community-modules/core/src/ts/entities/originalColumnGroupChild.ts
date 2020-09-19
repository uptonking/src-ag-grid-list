// Implemented by Column and OriginalColumnGroup. Allows the groups to contain a list of this type for it's children.
// See the note at the top of Column class.
import { OriginalColumnGroup } from './originalColumnGroup';

/** 表头列和分组表头都实现了本接口 */
export interface OriginalColumnGroupChild {
  isVisible(): boolean;
  getColumnGroupShow(): string | undefined;
  getId(): string;
  setOriginalParent(originalParent: OriginalColumnGroup | null): void;
}
