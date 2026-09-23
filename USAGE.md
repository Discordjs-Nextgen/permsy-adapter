# 📚 Permsy Nextgen Adapter - Complete Usage Guide

Comprehensive guide for all usage modes of nextgen-permsy-adapter.

## 📖 Table of Contents

- [Installation](#-installation)
- [Three Usage Modes](#-three-usage-modes)
  - [Mode 1: Global Auto-Check (Recommended)](#-mode-1-global-auto-check-recommended)
  - [Mode 2: Per-Command Manual Check](#-mode-2-per-command-manual-check)
  - [Mode 3: Plugin Mode](#-mode-3-plugin-mode)
- [Configuration Guide](#-configuration-guide)
- [Real-World Examples](#-real-world-examples)
- [Best Practices](#-best-practices)
- [Troubleshooting](#-troubleshooting)

---

## 🚀 Installation

```bash
npm install nextgen-permsy-adapter permsy
```

---

## 🎯 Three Usage Modes

### ⭐ Mode 1: Global Auto-Check (Recommended)

**Best for:** Most projects - clean, simple, maintainable

**Setup:**
```javascript
import { App, Intents } from 'discordjs-nextgen';
import { Permsy } from 'permsy';
import { NextgenAdapter, setupPermsyForPrefix } from 'nextgen-permsy-adapter';

const app = new App({ intents: Intents.ALL });

const permsy = new Permsy({
  configDir: './config',
  fileName: 'permsy.config.js',
  adapter: new NextgenAdapter()
});

// ONE LINE - Global auto-check
setupPermsyForPrefix(app, permsy);

// Load commands AFTER setup
app.prefix({ prefix: '!', folder: './commands/prefix' });
app.run(process.env.TOKEN);
```

**Your Commands:**
```javascript
// commands/prefix/ban.js
export default {
  name: 'ban',
  run: async (ctx) => {
    // NO permission check needed!
    // Users without permission never reach here
    await ctx.reply('User banned!');
  }
};
```

**Config:**
```javascript
// config/permsy.config.js
export default definePermissionConfig({
  defaultDenyMessage: "❌ No permission!",
  
  commands: {
    prefixes: {
      ban: {
        rolesOnly: ["ADMIN_ROLE_ID"],
        denyMessage: "⛔ Admin role required!"
      }
    }
  }
});
```

**✅ Advantages:**
- One-line setup
- Zero code in commands
- All config centralized
- Very clean codebase

**❌ Limitations:**
- All commands are checked (even if not in config)
- Harder to add custom logic per command

---

### 🔧 Mode 2: Per-Command Manual Check

**Best for:** When you need custom logic or only specific commands need protection

**Setup:**
```javascript
import { withPermsy } from 'nextgen-permsy-adapter';

export default {
  name: 'admin',
  run: withPermsy('admin', async (ctx) => {
    // Manual check with custom logic
    if (!await ctx.permsy.isAllowed(ctx)) {
      // Custom denied logic
      console.log('Access denied');
      return;
    }
    
    // Custom allowed logic
    console.log('Admin accessed');
    await ctx.reply('Admin panel');
  })
};
```

**✅ Advantages:**
- Full control per command
- Can add custom logic
- Only protect specific commands

**❌ Limitations:**
- Need to wrap each protected command
- More code to maintain

---

### 🔌 Mode 3: Plugin Mode

**Best for:** Middleware-based approach (alternative to Mode 1)

> **Note:** Due to Nextgen's architecture, Mode 1 (`setupPermsyForPrefix`) is recommended for better command name resolution.

**Setup:**
```javascript
import { PermsyPlugin } from 'nextgen-permsy-adapter';

app.use(new PermsyPlugin(permsy));
```

---

## ⚙️ Configuration Guide

### Basic Role-Based Access

```javascript
export default definePermissionConfig({
  defaultDenyMessage: "❌ No permission!",
  
  commands: {
    prefixes: {
      admin: {
        rolesOnly: ["ADMIN_ROLE_ID"]
      }
    }
  }
});
```

### Permission-Based Access

```javascript
commands: {
  prefixes: {
    ban: {
      permissionsOnly: ["BAN_MEMBERS"]
    },
    kick: {
      permissionsOnly: ["KICK_MEMBERS"]
    }
  }
}
```

### User Whitelist

```javascript
commands: {
  prefixes: {
    owner: {
      usersOnly: ["OWNER_USER_ID"]
    }
  }
}
```

### Channel Restrictions

```javascript
commands: {
  prefixes: {
    modlog: {
      channelsOnly: ["MOD_CHANNEL_ID"]
    }
  }
}
```

### Multiple Requirements (OR Logic)

```javascript
commands: {
  prefixes: {
    moderate: {
      rolesOnly: ["MOD_ROLE_ID"],
      usersOnly: ["OWNER_USER_ID"],
      permissionsOnly: ["MODERATE_MEMBERS"]
      // User needs ANY ONE of these (OR logic)
    }
  }
}
```

### Custom Deny Messages

```javascript
commands: {
  prefixes: {
    ban: {
      rolesOnly: ["ADMIN_ROLE_ID"],
      denyMessage: "⛔ **Access Denied!**\n\nYou need Admin role to use this command."
    }
  }
}
```

---

## 🌟 Real-World Examples

### Example 1: Simple Bot

```javascript
// index.js
import { App, Intents } from 'discordjs-nextgen';
import { Permsy } from 'permsy';
import { NextgenAdapter, setupPermsyForPrefix } from 'nextgen-permsy-adapter';

const app = new App({ intents: Intents.ALL });

const permsy = new Permsy({
  configDir: './config',
  fileName: 'permsy.config.js',
  adapter: new NextgenAdapter()
});

setupPermsyForPrefix(app, permsy);

app.prefix({ prefix: '!', folder: './commands/prefix' });
app.run(process.env.TOKEN);
```

```javascript
// config/permsy.config.js
import { definePermissionConfig } from 'permsy';

export default definePermissionConfig({
  defaultDenyMessage: "❌ No permission!",
  
  commands: {
    prefixes: {
      ban: { rolesOnly: ["ADMIN_ROLE_ID"] },
      kick: { rolesOnly: ["MODERATOR_ROLE_ID"] }
    }
  }
});
```

```javascript
// commands/prefix/ban.js
export default {
  name: 'ban',
  run: async (ctx) => {
    await ctx.reply('User banned!');
  }
};
```

```javascript
// commands/prefix/help.js  
export default {
  name: 'help',
  run: async (ctx) => {
    // Not in config = everyone can use
    await ctx.reply('Help menu...');
  }
};
```

---

### Example 2: Mixed Protection

Some commands protected, others public:

```javascript
// config/permsy.config.js
commands: {
  prefixes: {
    ban: { rolesOnly: ["ADMIN_ROLE_ID"] },
    kick: { permissionsOnly: ["KICK_MEMBERS"] },
    // help, ping, info - not listed = public
  }
}
```

---

### Example 3: With Custom Logic

```javascript
// commands/prefix/admin.js
import { withPermsy } from 'nextgen-permsy-adapter';

export default {
  name: 'admin',
  run: withPermsy('admin', async (ctx) => {
    if (!await ctx.permsy.isAllowed(ctx)) {
      // Log denied attempts
      console.log(`[SECURITY] ${ctx.user.username} tried to use admin command`);
      return;
    }
    
    // Log successful access
    console.log(`[AUDIT] ${ctx.user.username} accessed admin panel`);
    await ctx.reply('Admin panel opened');
  })
};
```

---

### Example 4: Moderation Bot

```javascript
// config/permsy.config.js
export default definePermissionConfig({
  defaultDenyMessage: "❌ You don't have moderation permissions!",
  
  commands: {
    prefixes: {
      ban: {
        permissionsOnly: ["BAN_MEMBERS"],
        channelsOnly: ["MOD_CHANNEL_ID"],
        denyMessage: "⛔ You need BAN_MEMBERS permission and must use this in mod channel!"
      },
      
      kick: {
        permissionsOnly: ["KICK_MEMBERS"],
        channelsOnly: ["MOD_CHANNEL_ID"]
      },
      
      mute: {
        rolesOnly: ["MODERATOR_ROLE_ID"],
        channelsOnly: ["MOD_CHANNEL_ID"]
      },
      
      warn: {
        rolesOnly: ["MODERATOR_ROLE_ID", "ADMIN_ROLE_ID"]
      }
    }
  }
});
```

---

## 💡 Best Practices

### ✅ Do

1. **Use Mode 1 for most cases:**
   ```javascript
   setupPermsyForPrefix(app, permsy);
   ```

2. **Keep all permissions in config:**
   ```javascript
   // Good - centralized
   commands: {
     prefixes: {
       ban: { rolesOnly: ["ADMIN_ROLE_ID"] }
     }
   }
   ```

3. **Use clear deny messages:**
   ```javascript
   denyMessage: "⛔ You need Admin role to use this command!"
   ```

4. **Call setup BEFORE loading commands:**
   ```javascript
   setupPermsyForPrefix(app, permsy);  // First
   app.prefix({ folder: './commands' }); // Then
   ```

### ❌ Don't

1. **Don't hardcode permissions in commands:**
   ```javascript
   // Bad
   if (ctx.user.id !== 'OWNER_ID') return;
   // Use Permsy config instead
   ```

2. **Don't mix approaches unnecessarily:**
   ```javascript
   // Bad - pick one approach
   setupPermsyForPrefix(app, permsy);
   // And also using withPermsy everywhere
   ```

3. **Don't repeat config in multiple places:**
   ```javascript
   // Bad - config should be in permsy.config.js only
   const ADMIN_ROLES = ['123'];
   if (!hasRole(ADMIN_ROLES)) return;
   ```

---

## 🔍 Troubleshooting

### Commands not being checked

**Problem:** Commands execute without permission check

**Solution:** Make sure you call `setupPermsyForPrefix` BEFORE loading commands:

```javascript
// Correct order:
setupPermsyForPrefix(app, permsy);  // 1. Setup
app.prefix({ folder: './commands' }); // 2. Load
```

### Command name is empty

**Problem:** Adapter shows `Command: ` (empty)

**Solution:** Use `withPermsy()` wrapper or `setupPermsyForPrefix()`:

```javascript
// Option 1: Global setup
setupPermsyForPrefix(app, permsy);

// Option 2: Per-command wrapper
run: withPermsy('commandName', async (ctx) => {
  // ...
})
```

### Roles not detected

**Problem:** User has role but permission denied

**Solution:** Check that:
1. Role ID is correct in config
2. Role ID is a string: `"123456789"`
3. Bot has proper intents
4. User is in a guild (not DM)

### Config not loading

**Problem:** Changes to config not applied

**Solution:**
1. Check config file path is correct
2. Restart bot after config changes
3. Check for syntax errors in config file

---

## 📊 Comparison Table

| Feature | Mode 1 (Global) | Mode 2 (Manual) | Mode 3 (Plugin) |
|---------|----------------|-----------------|-----------------|
| **Setup complexity** | ⭐ Very Easy | ⭐⭐ Easy | ⭐ Very Easy |
| **Command code** | ✅ None needed | ⚠️ Need wrapper | ✅ None needed |
| **Flexibility** | ⭐⭐ Medium | ⭐⭐⭐ High | ⭐ Low |
| **Custom logic** | ❌ Harder | ✅ Easy | ❌ Harder |
| **Recommended for** | Most projects | Advanced needs | Alternative |

---

## 🎓 Learning Path

### Step 1: Start Simple

```javascript
// Use Mode 1 - Global Auto-Check
setupPermsyForPrefix(app, permsy);
```

### Step 2: Add Configurations

```javascript
// Add commands to config as needed
commands: {
  prefixes: {
    admin: { rolesOnly: ["ADMIN_ID"] }
  }
}
```

### Step 3: Advanced Usage

```javascript
// Use withPermsy for commands needing custom logic
run: withPermsy('special', async (ctx) => {
  if (!await ctx.permsy.isAllowed(ctx)) {
    // Custom handling
    return;
  }
  // Custom logic
})
```

---

## 🚀 Quick Reference

### Setup Commands

```javascript
// Mode 1: Global
setupPermsyForPrefix(app, permsy);

// Mode 2: Per-command
import { withPermsy } from 'nextgen-permsy-adapter';
run: withPermsy('name', async (ctx) => { ... })

// Mode 3: Plugin
app.use(new PermsyPlugin(permsy));
```

### Config Template

```javascript
export default definePermissionConfig({
  defaultDenyMessage: "❌ Message",
  
  commands: {
    prefixes: {
      commandName: {
        rolesOnly: ["ROLE_ID"],
        usersOnly: ["USER_ID"],
        permissionsOnly: ["PERMISSION"],
        channelsOnly: ["CHANNEL_ID"],
        denyMessage: "Custom message"
      }
    }
  }
});
```

---

## 📚 Additional Resources

- **Main README**: [README.md](./README.md)
- **Permsy Core Docs**: [github.com/Umit-Ulusoy/permsy](https://github.com/Umit-Ulusoy/permsy)
- **Nextgen Framework**: [Nextgen Docs](https://github.com/yourusername/nextgen)

---

**🎉 You're ready to use Permsy with Nextgen!** Choose your mode and start building! 🚀
