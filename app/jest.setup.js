// globalThis.expo のモック（expo-modules-core の EventEmitter 等に必要）
if (!globalThis.expo) {
  globalThis.expo = {
    EventEmitter: class EventEmitter {
      addListener() { return {remove: () => {}}; }
      removeListener() {}
      emit() {}
      removeAllListeners() {}
    },
    modules: {},
    NativeModulesProxy: {},
  };
}
