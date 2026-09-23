import type { AdapterContext, BaseAdapter } from "permsy";
import type { Context } from "./context-interface.js";
import type { NextgenSource } from "./types.js";

/**
 * NextgenAdapter - Official adapter for Permsy permission management with Nextgen framework
 * 
 * This adapter bridges Nextgen's Context system with Permsy's permission engine,
 * enabling seamless permission checks for both slash and prefix commands.
 * 
 * @example
 * ```typescript
 * import { App } from 'nextgen';
 * import { Permsy } from 'permsy';
 * import { NextgenAdapter } from '@permsy/adapter-nextgen';
 * 
 * const app = new App();
 * const permsy = new Permsy({
 *   configDir: './config',
 *   fileName: 'permsy.config.js',
 *   adapter: new NextgenAdapter()
 * });
 * 
 * // Use as middleware
 * app.use(async (ctx, next) => {
 *   const allowed = await permsy.isAllowed(ctx);
 *   if (allowed) await next();
 * });
 * ```
 */
export class NextgenAdapter implements BaseAdapter {
  /**
   * Helper to extract permissions from Nextgen's memberPermissions string
   * Nextgen stores permissions as a bitfield string
   */
  private extractPermissions(memberPermissions: string | null | undefined): string[] {
    if (!memberPermissions) return [];

    try {
      const bitfield = BigInt(memberPermissions);
      const permissions: string[] = [];

      // Discord permission flags (simplified list - add more as needed)
      const PERMISSION_FLAGS: Record<string, bigint> = {
        CREATE_INSTANT_INVITE: 1n << 0n,
        KICK_MEMBERS: 1n << 1n,
        BAN_MEMBERS: 1n << 2n,
        ADMINISTRATOR: 1n << 3n,
        MANAGE_CHANNELS: 1n << 4n,
        MANAGE_GUILD: 1n << 5n,
        ADD_REACTIONS: 1n << 6n,
        VIEW_AUDIT_LOG: 1n << 7n,
        PRIORITY_SPEAKER: 1n << 8n,
        STREAM: 1n << 9n,
        VIEW_CHANNEL: 1n << 10n,
        SEND_MESSAGES: 1n << 11n,
        SEND_TTS_MESSAGES: 1n << 12n,
        MANAGE_MESSAGES: 1n << 13n,
        EMBED_LINKS: 1n << 14n,
        ATTACH_FILES: 1n << 15n,
        READ_MESSAGE_HISTORY: 1n << 16n,
        MENTION_EVERYONE: 1n << 17n,
        USE_EXTERNAL_EMOJIS: 1n << 18n,
        VIEW_GUILD_INSIGHTS: 1n << 19n,
        CONNECT: 1n << 20n,
        SPEAK: 1n << 21n,
        MUTE_MEMBERS: 1n << 22n,
        DEAFEN_MEMBERS: 1n << 23n,
        MOVE_MEMBERS: 1n << 24n,
        USE_VAD: 1n << 25n,
        CHANGE_NICKNAME: 1n << 26n,
        MANAGE_NICKNAMES: 1n << 27n,
        MANAGE_ROLES: 1n << 28n,
        MANAGE_WEBHOOKS: 1n << 29n,
        MANAGE_EMOJIS_AND_STICKERS: 1n << 30n,
        USE_APPLICATION_COMMANDS: 1n << 31n,
        REQUEST_TO_SPEAK: 1n << 32n,
        MANAGE_EVENTS: 1n << 33n,
        MANAGE_THREADS: 1n << 34n,
        CREATE_PUBLIC_THREADS: 1n << 35n,
        CREATE_PRIVATE_THREADS: 1n << 36n,
        USE_EXTERNAL_STICKERS: 1n << 37n,
        SEND_MESSAGES_IN_THREADS: 1n << 38n,
        USE_EMBEDDED_ACTIVITIES: 1n << 39n,
        MODERATE_MEMBERS: 1n << 40n,
      };

      for (const [name, flag] of Object.entries(PERMISSION_FLAGS)) {
        if ((bitfield & flag) === flag) {
          permissions.push(name);
        }
      }

      return permissions;
    } catch {
      return [];
    }
  }

  /**
   * Helper to extract roles from Nextgen's context
   * For prefix commands: uses message.member.roles (already available)
   * For slash commands: uses guild.fetchMember() as fallback
   */
  private async extractRoles(context: Context): Promise<string[]> {
    // First, try to get roles from source (for prefix commands with message.member)
    const source = (context as any).source;
    
    // Check if source is a Message with member data
    if (source && 'member' in source && source.member && source.member.roles) {
      return source.member.roles;
    }
    
    // Check if source is an Interaction with member data
    if (source && 'member' in source && source.member && source.member.roles) {
      return source.member.roles;
    }
    
    // Fallback: fetch from guild if available
    if (!context.guild) {
      return [];
    }

    try {
      const member = await context.guild.fetchMember(context.user.id);
      return member.roles || [];
    } catch (error) {
      console.warn(`[NextgenAdapter] Failed to fetch roles for user ${context.user.id}:`, error);
      return [];
    }
  }

  /**
   * Resolves incoming Context into normalized Permsy AdapterContext
   */
  resolveContext = async (source: unknown): Promise<AdapterContext> => {
    if (!source || typeof source !== "object") {
      throw new Error(
        "[permsy-nextgen-adapter] Invalid 'source': expected an object."
      );
    }

    let context: Context;
    let commandName: string;
    let type: "slash" | "prefix";

    // Handle explicit { kind } structure
    if ("kind" in source) {
      const wrapped = source as
        | { kind: "slash"; context: Context }
        | { kind: "prefix"; context: Context; commandName: string };

      if (wrapped.kind === "slash") {
        context = wrapped.context;
        commandName = context.commandName ?? "";
        type = "slash";
      } else if (wrapped.kind === "prefix") {
        context = wrapped.context;
        commandName = wrapped.commandName;
        type = "prefix";
      } else {
        throw new Error(
          "[permsy-nextgen-adapter] Unknown 'kind' in wrapped source."
        );
      }
    }
    // Handle direct Context object
    else if ("user" in source && "channel" in source && "isInteraction" in source) {
      context = source as Context;
      
      // For prefix commands, try to get command name from multiple sources
      // Priority: _permsyCommandName (wrapper) > commandName (slash) > _commandName (handler)
      const ctxAny = context as any;
      commandName = ctxAny._permsyCommandName ?? context.commandName ?? ctxAny._commandName ?? "";
      
      // Determine type based on isSlashCommand or isInteraction
      type = context.isSlashCommand || context.isInteraction ? "slash" : "prefix";
    } else {
      throw new Error(
        "[permsy-nextgen-adapter] Unsupported 'source' structure. Expected Context or { kind, context }."
      );
    }

    // Extract permissions and roles
    const permissions = this.extractPermissions(context.memberPermissions);
    const roles = await this.extractRoles(context);

    return {
      type,
      userId: context.user.id,
      commandName,
      channelId: context.channel?.id ?? "",
      roles,
      permissions,
    };
  };

  /**
   * Sends an access denied message using Nextgen's reply method
   */
  sendDenyMessage = async (source: unknown, denyMessage: string): Promise<void> => {
    if (!source || typeof source !== "object") {
      throw new Error(
        "[permsy-nextgen-adapter] Cannot send deny message: invalid source."
      );
    }

    let context: Context;

    // Handle wrapped { kind, context } structure
    if ("kind" in source && "context" in source) {
      const wrapped = source as { kind: string; context: Context };
      context = wrapped.context;
    }
    // Handle direct Context object
    else if ("reply" in source && "user" in source) {
      context = source as Context;
    } else {
      throw new Error(
        "[permsy-nextgen-adapter] Cannot send deny message: no valid context found."
      );
    }

    await context.reply({
      content: denyMessage,
      flags: 64, // Ephemeral flag for interactions
    });
  };
}
