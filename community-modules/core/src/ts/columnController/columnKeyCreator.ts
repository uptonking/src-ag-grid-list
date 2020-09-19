import { _ } from '../utils';

/**
 * class returns a unique id to use for the column.
 * It checks the existing columns, and if the requested id is already taken,
 * it will start appending numbers until it gets a unique id.
 * eg, if the col field is 'name', it will try ids: {name, name_1, name_2...}.
 * if no field or id provided in the col, it will try ids of natural numbers.
 */
export class ColumnKeyCreator {
  /** 保存所有已使用key的映射表，用来去重复 */
  private existingKeys: { [key: string]: boolean } = {};

  public addExistingKeys(keys: string[]): void {
    for (let i = 0; i < keys.length; i++) {
      this.existingKeys[keys[i]] = true;
    }
  }

  /**
   * 计算与现有colId不同的唯一key，具体实现是添加不重复的 _数字后缀
   * @param colId 该列现有id
   * @param colField 该列字段名
   */
  public getUniqueKey(colId: string, colField: string): string {
    // in case user passed in number for colId, convert to string
    colId = _.toStringOrNull(colId);

    let count = 0;
    while (true) {
      let idToTry: string;
      if (colId) {
        idToTry = colId;
        if (count !== 0) {
          idToTry += '_' + count;
        }
      } else if (colField) {
        idToTry = colField;
        if (count !== 0) {
          idToTry += '_' + count;
        }
      } else {
        idToTry = '' + count;
      }

      if (!this.existingKeys[idToTry]) {
        this.existingKeys[idToTry] = true;
        return idToTry;
      }

      count++;
    }
  }
}
