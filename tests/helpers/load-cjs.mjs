import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

export function loadMiniProgramModule(entryPath, options = {}) {
  const cache = new Map();
  const globals = options.globals || {};
  const stubs = options.stubs || {};

  function load(filename) {
    const resolved = path.resolve(filename);
    if (cache.has(resolved)) return cache.get(resolved).exports;

    const module = { exports: {} };
    cache.set(resolved, module);
    const source = fs.readFileSync(resolved, 'utf8');
    const dirname = path.dirname(resolved);
    const localRequire = request => {
      if (Object.prototype.hasOwnProperty.call(stubs, request)) return stubs[request];
      if (!request.startsWith('.')) return options.require?.(request) || require(request);
      const target = path.resolve(dirname, request);
      return load(path.extname(target) ? target : `${target}.js`);
    };
    const context = vm.createContext({
      console,
      Date,
      Error,
      JSON,
      Math,
      Promise,
      RegExp,
      String,
      Number,
      Boolean,
      Array,
      Object,
      setTimeout,
      clearTimeout,
      ...globals,
    });
    const wrapper = new vm.Script(`(function (module, exports, require) {\n${source}\n})`, {
      filename: resolved,
    }).runInContext(context);
    wrapper(module, module.exports, localRequire);
    return module.exports;
  }

  return load(entryPath);
}

export function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getStorageSync: key => values.get(key),
    setStorageSync: (key, value) => values.set(key, value),
    removeStorageSync: key => values.delete(key),
    snapshot: () => Object.fromEntries(values),
  };
}
