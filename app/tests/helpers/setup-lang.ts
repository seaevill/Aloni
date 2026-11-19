// The unit tests assume the app's default (Greek): Node reports «en-US» as the phone's language, which would now be honoured.
Object.defineProperty(globalThis.navigator, 'languages', { value: ['el-GR'], configurable: true });
