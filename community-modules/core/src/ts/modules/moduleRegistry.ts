import { Module } from '../interfaces/iModule';
import { ModuleNames } from './moduleNames';
import { _ } from '../utils';

/**
 * 负责注册ag-grid的社区版或企业版的module，是一个static工具类
 */
export class ModuleRegistry {
  // having in a map a) removes duplicates and b) allows fast lookup
  private static modulesMap: { [name: string]: Module } = {};
  /** 是否基于module，如使用ag-grid-community包就不是module，使用@ag-grid-community/core包就是 */
  private static moduleBased: boolean | undefined;

  /** 注册一个module，存放到modulesMap映射表 */
  public static register(module: Module, moduleBased = true): void {
    ModuleRegistry.modulesMap[module.moduleName] = module;

    if (ModuleRegistry.moduleBased === undefined) {
      ModuleRegistry.moduleBased = moduleBased;
    } else {
      if (ModuleRegistry.moduleBased !== moduleBased) {
        _.doOnce(() => {
          console.warn(
            `ag-Grid: You are mixing modules (i.e. @ag-grid-community/core) and packages (ag-grid-community) - you can only use one or the other of these mechanisms.`,
          );
          console.warn(
            'Please see https://www.ag-grid.com/javascript-grid-packages-modules/ for more information.',
          );
        }, 'ModulePackageCheck');
      }
    }
  }

  // noinspection JSUnusedGlobalSymbols
  /** 注册多个modules */
  public static registerModules(modules: Module[], moduleBased = true): void {
    if (!modules) {
      return;
    }
    modules.forEach((module) => ModuleRegistry.register(module, moduleBased));
  }

  public static assertRegistered(
    moduleName: ModuleNames,
    reason: string,
  ): boolean {
    if (this.isRegistered(moduleName)) {
      return true;
    }

    const warningKey = reason + moduleName;
    const warningMessage = `ag-Grid: unable to use ${reason} as module ${moduleName} is not present. Please see: https://www.ag-grid.com/javascript-grid-modules/`;

    _.doOnce(() => {
      console.warn(warningMessage);
    }, warningKey);

    return false;
  }

  public static isRegistered(moduleName: ModuleNames): boolean {
    return !!ModuleRegistry.modulesMap[moduleName];
  }

  /** 从modulesMap映射表中获取注册的所有模块对象 */
  public static getRegisteredModules(): Module[] {
    return _.values(ModuleRegistry.modulesMap);
  }

  public static isPackageBased(): boolean {
    return !ModuleRegistry.moduleBased;
  }
}
