import { Autowired, Bean, PostConstruct } from '../context/context';
import { GridOptionsWrapper } from '../gridOptionsWrapper';
import { RowNode } from '../entities/rowNode';
import { BeanStub } from '../context/beanStub';

/**
 * The value cache is used for the results of value getters.
 * If you are not using value getters, then you do not need the value cache.
 * 可以间接存取rowNode.__cacheData的值，还支持其他操作，如设置缓存版本与过期。
 */
@Bean('valueCache')
export class ValueCache extends BeanStub {
  @Autowired('gridOptionsWrapper')
  private gridOptionsWrapper: GridOptionsWrapper;

  private cacheVersion = 0;
  private active: boolean;
  private neverExpires: boolean;

  @PostConstruct
  public init(): void {
    this.active = this.gridOptionsWrapper.isValueCache();
    this.neverExpires = this.gridOptionsWrapper.isValueCacheNeverExpires();
  }

  public onDataChanged(): void {
    if (this.neverExpires) {
      return;
    }

    this.expire();
  }

  public expire(): void {
    this.cacheVersion++;
  }

  /** 设置 rowNode.__cacheData[colId] 的值为value */
  public setValue(rowNode: RowNode, colId: string, value: any): any {
    if (this.active) {
      if (rowNode.__cacheVersion !== this.cacheVersion) {
        rowNode.__cacheVersion = this.cacheVersion;
        rowNode.__cacheData = {};
      }

      rowNode.__cacheData[colId] = value;
    }
  }

  /** 返回 rowNode.__cacheData[colId] 的值 */
  public getValue(rowNode: RowNode, colId: string): any {
    if (!this.active || rowNode.__cacheVersion !== this.cacheVersion) {
      return undefined;
    }

    return rowNode.__cacheData[colId];
  }
}
