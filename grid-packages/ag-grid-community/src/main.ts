import { ModuleRegistry } from '@ag-grid-community/core';
import { ClientSideRowModelModule } from '@ag-grid-community/client-side-row-model';
import { InfiniteRowModelModule } from '@ag-grid-community/infinite-row-model';
import { CsvExportModule } from '@ag-grid-community/csv-export';

ModuleRegistry.register(ClientSideRowModelModule, false);
ModuleRegistry.register(InfiniteRowModelModule, false);
ModuleRegistry.register(CsvExportModule, false);

export * from '@ag-grid-community/core';
