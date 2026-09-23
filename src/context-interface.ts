/**
 * Minimal interface representing Nextgen's Context structure
 * This allows the adapter to work without importing the full Nextgen library
 */
export interface Context {
  user: {
    id: string;
  };
  channel: {
    id: string;
  } | null;
  guild: {
    id: string;
    fetchMember: (userId: string) => Promise<{
      user: { id: string };
      nick: string | null;
      roles: string[];
    }>;
  } | null;
  commandName?: string | null;
  _commandName?: string; // Internal property for prefix commands
  isInteraction: boolean;
  isSlashCommand?: boolean;
  memberPermissions?: string | null;
  reply: (options: string | Record<string, any>) => Promise<void>;
}
