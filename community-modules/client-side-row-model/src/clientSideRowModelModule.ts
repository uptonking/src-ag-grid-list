import { Module, ModuleNames } from '@ag-grid-community/core';
import { ClientSideRowModel } from './clientSideRowModel/clientSideRowModel';
import { FilterStage } from './clientSideRowModel/filterStage';
import { SortStage } from './clientSideRowModel/sortStage';
import { FlattenStage } from './clientSideRowModel/flattenStage';
import { SortService } from './clientSideRowModel/sortService';
import { FilterService } from './clientSideRowModel/filterService';
import { ImmutableService } from './clientSideRowModel/immutableService';

/**
 * 包含最常用的rowModel的module
 */
export const ClientSideRowModelModule: Module = {
  moduleName: ModuleNames.ClientSideRowModelModule,
  beans: [
    SortStage,
    FilterStage,
    FlattenStage,
    SortService,
    FilterService,
    ImmutableService,
  ],
  rowModels: { clientSide: ClientSideRowModel },
};
