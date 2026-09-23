import { Permsy } from "permsy";
import type { Context } from "./context-interface.js";

/**
 * Extend Context interface to include permsy
 */
interface ContextWithPermsy extends Context {
  permsy: Permsy;
}

/**
 * createPermsyPrefixWrapper - Creates a wrapper for all prefix commands
 * 
 * This function wraps ALL prefix commands to automatically check permissions
 * before they run. You don't need to add permission checks in each command.
 * 
 * @param permsy - The Permsy instance
 * @returns Function that wraps prefix commands
 */
function createPermsyPrefixWrapper(permsy: Permsy) {
  return (cmd: any) => {
    const originalRun = cmd.run;
    
    // Wrap the run function with permission check
    cmd.run = withPermsy(cmd.name, async (ctx: Context, ...args: any[]) => {
      // Automatic permission check
      const allowed = await permsy.isAllowed(ctx);
      
      if (!allowed) {
        return; // Deny message already sent by adapter
      }
      
      // Call original command
      return originalRun(ctx, ...args);
    });
    
    return cmd;
  };
}

/**
 * setupPermsyForPrefix - Setup Permsy to auto-check ALL prefix commands
 * 
 * Call this BEFORE loading your commands. All prefix commands will be
 * automatically wrapped with permission checks.
 * 
 * @param app - Nextgen App instance
 * @param permsy - Permsy instance
 * 
 * @example
 * ```typescript
 * import { App } from 'discordjs-nextgen';
 * import { Permsy } from 'permsy';
 * import { NextgenAdapter, setupPermsyForPrefix } from '@permsy/adapter-nextgen';
 * 
 * const app = new App({ intents: Intents.ALL });
 * 
 * const permsy = new Permsy({
 *   configDir: './config',
 *   fileName: 'permsy.config.js',
 *   adapter: new NextgenAdapter()
 * });
 * 
 * // Setup global auto-check for prefix commands
 * setupPermsyForPrefix(app, permsy);
 * 
 * // Now load commands - they will be auto-wrapped
 * app.prefix({ prefix: '!', folder: './commands/prefix' });
 * 
 * // No need to check permissions in commands!
 * ```
 */
export function setupPermsyForPrefix(app: any, permsy: Permsy): void {
  // Get the original prefix method
  const originalPrefix = app.prefix.bind(app);
  
  // Override prefix method to wrap commands
  app.prefix = function(options: any) {
    // Call original to set up handler
    const result = originalPrefix(options);
    
    // If folder is provided, wrap will happen in file loader callback
    // We need to hook into the PrefixHandler's addCommand method
    if (app.prefixHandler) {
      const originalAddCommand = app.prefixHandler.addCommand.bind(app.prefixHandler);
      
      app.prefixHandler.addCommand = function(cmd: any) {
        const wrappedCmd = createPermsyPrefixWrapper(permsy)(cmd);
        return originalAddCommand(wrappedCmd);
      };
    }
    
    return result;
  };
  
  // Also attach permsy to context for manual checks if needed
  app.use(attachPermsy(permsy));
}

/**
 * withPermsy - Wraps a command function to inject command name into context
 * 
 * This wrapper ensures that the command name is available in context for Permsy checks.
 * Use this to wrap your prefix command handlers.
 * 
 * @param commandName - The name of the command
 * @param handler - The command handler function
 * @returns Wrapped handler function
 * 
 * @example
 * ```typescript
 * import { withPermsy } from '@permsy/adapter-nextgen';
 * 
 * export default {
 *   name: 'hello',
 *   run: withPermsy('hello', async (ctx) => {
 *     if (!await ctx.permsy.isAllowed(ctx)) return;
 *     await ctx.reply('Hello!');
 *   })
 * };
 * ```
 */
export function withPermsy(
  commandName: string,
  handler: (ctx: Context, ...args: any[]) => Promise<void>
) {
  return async (ctx: Context, ...args: any[]) => {
    // Inject command name into context
    (ctx as any)._permsyCommandName = commandName;
    
    // Call original handler
    return handler(ctx, ...args);
  };
}

/**
 * PermsyPlugin - Middleware plugin for integrating Permsy with Nextgen App
 * 
 * This plugin adds AUTOMATIC permission checking to your Nextgen bot using
 * the middleware system. All commands will be checked automatically before
 * they execute.
 * 
 * Use this when you want all commands to be automatically checked. Commands
 * not in the config will be allowed by default.
 * 
 * @example
 * ```typescript
 * import { App } from 'discordjs-nextgen';
 * import { Permsy } from 'permsy';
 * import { NextgenAdapter, PermsyPlugin } from '@permsy/adapter-nextgen';
 * 
 * const app = new App();
 * 
 * const permsy = new Permsy({
 *   configDir: './config',
 *   fileName: 'permsy.config.js',
 *   adapter: new NextgenAdapter()
 * });
 * 
 * // Attach as middleware with auto-check
 * app.use(new PermsyPlugin(permsy));
 * 
 * // Now all commands will be checked automatically!
 * // Commands not in config are allowed by default
 * ```
 */
export class PermsyPlugin {
  constructor(private permsy: Permsy) {
    console.log('[PermsyPlugin] Constructor called');
    console.log('[PermsyPlugin] Permsy instance:', this.permsy ? 'EXISTS' : 'UNDEFINED');
    console.log('[PermsyPlugin] Permsy.isAllowed:', typeof this.permsy?.isAllowed === 'function' ? 'EXISTS' : 'MISSING');
  }

  /**
   * Plugin setup method called by Nextgen's App.use()
   */
  setup = (app: any): void => {
    console.log('[PermsyPlugin] Setup called');
    console.log('[PermsyPlugin] this.permsy in setup:', this.permsy ? 'EXISTS' : 'UNDEFINED');
    
    // Register the middleware directly with the app's middleware manager
    const middlewareFn = async (ctx: Context, next: () => Promise<void>) => {
      console.log('[PermsyPlugin] Middleware function called');
      console.log('[PermsyPlugin] this.permsy in middleware:', this.permsy ? 'EXISTS' : 'UNDEFINED');
      
      // Check if this is a command context (slash or prefix)
      const ctxAny = ctx as any;
      const hasCommand = ctx.commandName || ctxAny._commandName;
      
      if (!hasCommand) {
        console.log('[PermsyPlugin] No command, skipping check');
        await next();
        return;
      }

      console.log(`[PermsyPlugin] Checking command: ${hasCommand}`);

      // Check permissions with Permsy
      try {
        const allowed = await this.permsy.isAllowed(ctx);
        console.log(`[PermsyPlugin] Command ${hasCommand} - Allowed: ${allowed}`);

        // If allowed, proceed to command handler
        if (allowed) {
          await next();
        } else {
          console.log(`[PermsyPlugin] Command ${hasCommand} - BLOCKED`);
        }
      } catch (error) {
        console.error('[PermsyPlugin] Error checking permissions:', error);
        throw error;
      }
      // If not allowed, Permsy adapter already sent the deny message
    };

    console.log('[PermsyPlugin] Registering middleware function');
    app.use(middlewareFn);
    console.log('[PermsyPlugin] Middleware registered');
  };
}


/**
 * attachPermsy - Attaches Permsy to context WITHOUT automatic checking
 * 
 * INTERNAL USE - Called by setupPermsyForPrefix
 */
function attachPermsy(permsy: Permsy) {
  return async (ctx: Context, next: () => Promise<void>) => {
    (ctx as ContextWithPermsy).permsy = permsy;
    await next();
  };
}
