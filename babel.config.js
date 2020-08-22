module.exports = function (api) {
  // 若build依赖于env，就不要再指定api.cache为forever或never了
  const env = api.env();
  // api.cache(true);

  // Plugins run before Presets. Plugin ordering is first to last.
  const plugins = [
    [
      'babel-plugin-styled-components',
      {
        displayName: true,
        fileName: true,
      },
    ],
    'react-refresh/babel',
    ['@babel/plugin-proposal-decorators', { decoratorsBeforeExport: true }],
  ];

  function configModule() {
    if (env === 'test' || env === 'cjs') {
      return 'commonjs';
    }
    // 默认会编译成esm
    return false;
  }

  // Preset ordering is reversed (last to first).
  const presets = [
    [
      '@babel/preset-env',
      {
        // modules: env === 'esm' ? false : 'commonjs',
        modules: configModule(),
        targets: {
          node: 'current',
          // browsers: '> 0.5%',
        },
        corejs: { version: 3, proposals: true },
        useBuiltIns: 'usage',
        debug: false,
      },
    ],
    [
      '@babel/preset-react',
      { development: process.env.BABEL_ENV !== 'production' },
    ],
    [
      '@babel/preset-typescript',
      {
        allExtensions: true,
        isTSX: true,
      },
    ],
  ];

  const ignore = ['node_modules'];

  return {
    plugins,
    presets,
    ignore,
  };
};
