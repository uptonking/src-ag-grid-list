import { ComponentMeta } from '../context/context';
import { AgGridRegisteredComponentInput } from '../components/framework/userComponentRegistry';
import { IComponent } from './iComponent';
import { IRowModel } from './iRowModel';

/**
 * 定义ag-grid module的类型，一个module其实就是导出的一个大对象，包含某些规定的属性和class
 */
export interface Module {
  moduleName: string;
  beans?: any[];
  agStackComponents?: ComponentMeta[];
  userComponents?: {
    componentName: string;
    componentClass: AgGridRegisteredComponentInput<IComponent<any>>;
  }[];
  rowModels?: { [name: string]: { new (): IRowModel } };
  dependantModules?: Module[]; // Niall / Sean - my addition
}
