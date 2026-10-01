import { createContext, useContext } from 'react';
import type { Script } from './languages';

/**
 * The writing system currently on screen, for picking fonts. Read by every
 * Text, so it changes only when the language does (and its fonts are loaded).
 * Outside the provider (e.g. the crash screen) it is Latin.
 */
export const ScriptContext = createContext<Script>('latin');

export function useScript(): Script {
  return useContext(ScriptContext);
}
