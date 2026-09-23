import type { Context } from "./context-interface.js";

/**
 * Source types that can be passed to the NextgenAdapter
 */
export type NextgenSource =
  | Context
  | { kind: "prefix"; context: Context; commandName: string }
  | { kind: "slash"; context: Context };
