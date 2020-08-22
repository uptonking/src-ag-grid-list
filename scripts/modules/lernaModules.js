const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const docsLock = require('./../docsLock');

const getModuleDirNames = (type, postfix = '-modules') =>
  fs
    .readdirSync(path.resolve(__dirname, `${type}${postfix}`))
    .filter((entry) => entry !== '.DS_Store');

const flattenArray = (array) => [].concat.apply([], array);

const mapToBarrelledScopes = (barrelName, moduleDirNames) =>
  flattenArray(
    moduleDirNames.map((moduleDirName) => [
      '--scope',
      `@ag-grid-${barrelName}/${moduleDirName}`,
    ]),
  );
const mapToScopes = (rootDirectory, moduleDirNames) =>
  flattenArray(
    moduleDirNames.map((moduleDirName) => [
      '--scope',
      require(`${rootDirectory}/${moduleDirName}/package.json`).name,
    ]),
  );

const getScopeForBarrelledModules = (rootDirectories) =>
  flattenArray(
    rootDirectories.map((rootDirectory) =>
      mapToBarrelledScopes(
        rootDirectory.replace('../../', ''),
        getModuleDirNames(rootDirectory),
      ),
    ),
  );
const getScopeForModules = (rootDirectory) =>
  mapToScopes(rootDirectory, getModuleDirNames(rootDirectory, ''));

const executeLernaCommand = (arguments) => {
  if (docsLock.isLocked()) {
    console.error(
      'Cannot execute a lerna command when the docs server is running.',
    );
    return;
  }

  const flattenedArguments = flattenArray(arguments);
  console.log(
    '----------------------------------------------------------------',
  );
  console.log(
    `Executing [../../node_modules/.bin/lerna ${flattenedArguments.join(' ')}`,
  );
  console.log(
    '----------------------------------------------------------------',
  );

  const child = spawn(
    path.resolve(__dirname, `../../node_modules/.bin/lerna`),
    flattenedArguments,
  );
  child.on('exit', (code) => {
    console.log(`Child process exited with code ${code}`);
  });
  child.stdout.on('data', (data) => {
    console.log(` ${data}`);
  });
  child.stderr.on('data', (data) => {
    console.log(`${data}`);
  });
};

const getCommunityScopes = () =>
  flattenArray(getScopeForBarrelledModules(['../../community']));
const getEnterpriseScopes = () =>
  flattenArray(getScopeForBarrelledModules(['../../enterprise']));
const getModuleScopes = () =>
  flattenArray(
    getScopeForBarrelledModules(['../../community', '../../enterprise']),
  );
const getChartsModuleScopes = () =>
  flattenArray(getScopeForModules('../../charts-packages'));

module.exports.cleanCommunityModules = () =>
  executeLernaCommand(['clean', '--yes', getCommunityScopes()]);
module.exports.cleanEnterpriseModules = () =>
  executeLernaCommand(['clean', '--yes', getEnterpriseScopes()]);
module.exports.cleanModules = () =>
  executeLernaCommand(['clean', '--yes', getModuleScopes()]);

module.exports.bootstrapCommunityModules = () =>
  executeLernaCommand(['bootstrap', getCommunityScopes()]);
module.exports.bootstrapEnterpriseModules = () =>
  executeLernaCommand(['bootstrap', getEnterpriseScopes()]);
module.exports.bootstrapModules = () =>
  executeLernaCommand(['bootstrap', getModuleScopes()]);

module.exports.buildCommunityModules = () =>
  executeLernaCommand(['run', 'build', getCommunityScopes()]);
module.exports.buildEnterpriseModules = () =>
  executeLernaCommand(['run', 'build', getEnterpriseScopes()]);
module.exports.buildModules = () =>
  executeLernaCommand(['run', 'build', getModuleScopes()]);

module.exports.buildChartsModules = () =>
  executeLernaCommand(['run', 'build', getChartsModuleScopes()]);

module.exports.testCommunityModules = () =>
  executeLernaCommand(['run', 'test', getCommunityScopes()]);
module.exports.testEnterpriseModules = () =>
  executeLernaCommand(['run', 'test', getEnterpriseScopes()]);
module.exports.testModules = () =>
  executeLernaCommand(['run', 'test', getModuleScopes()]);
