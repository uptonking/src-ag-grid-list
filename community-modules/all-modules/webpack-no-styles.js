/**
 * AUTOMATICALLY GENERATED FILE, DO NOT EDIT MANUALLY!
 * Update this file by running `lerna run webpack-updater` in the monorepo root folder.
 */
var ClientSideRowModelModule = require('../../community-modules/client-side-row-model');
var GridCoreModule = require('../../community-modules/core');
var CsvExportModule = require('../../community-modules/csv-export');
var InfiniteRowModelModule = require('../../community-modules/infinite-row-model');
var agGrid = require('./dist/es6/main');
Object.keys(agGrid).forEach(function (key) {
  exports[key] = agGrid[key];
});
agGrid.ModuleRegistry.register(
  ClientSideRowModelModule.ClientSideRowModelModule,
);
agGrid.ModuleRegistry.register(CsvExportModule.CsvExportModule);
agGrid.ModuleRegistry.register(InfiniteRowModelModule.InfiniteRowModelModule);
