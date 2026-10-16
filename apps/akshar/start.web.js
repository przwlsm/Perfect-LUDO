// In a browser, Skia's CanvasKit (WebAssembly) must load before any screen
// imports it. The wasm is copied to public/ by `setup-skia-web`.
import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web';

LoadSkiaWeb({ locateFile: (file) => `/${file}` }).then(() => require('expo-router/entry'));
