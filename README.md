# @permsy/adapter-nextgen

Official [Nextgen](https://github.com/Discordjs-Nextgen/nextgen) adapter for the [Permsy](https://github.com/Umit-Ulusoy/permsy) permission management engine.

> 🇹🇷 **Türkçe Kullanım Kılavuzu için aşağıya bakın:** [Turkish Documentation](#-turkish-documentation--türkçe-dokümantasyon)

---

## 🚀 Quick Start

### Installation

```bash
npm install @permsy/adapter-nextgen permsy
```

### Basic Setup (Recommended)

```javascript
import { App, Intents } from 'discordjs-nextgen';
import { Permsy } from 'permsy';
import { NextgenAdapter, setupPermsyForPrefix } from '@permsy/adapter-nextgen';

const app = new App({ intents: Intents.ALL });

// Initialize Permsy
const permsy = new Permsy({
  configDir: './config',
  fileName: 'permsy.config.js',
  adapter: new NextgenAdapter()
});

// Global auto-check for ALL prefix commands - ONE LINE!
setupPermsyForPrefix(app, permsy);

// Load commands
app.prefix({ prefix: '!', folder: './commands/prefix' });
app.slash({ folder: './commands/slash' });

app.run(process.env.TOKEN);
```

### Create Permission Config

Create `./config/permsy.config.js`:

```javascript
import { definePermissionConfig } from 'permsy';

export default definePermissionConfig({
  defaultDenyMessage: "❌ You don't have permission!",
  
  commands: {
    prefixes: {
      ban: {
        rolesOnly: ["ADMIN_ROLE_ID"],
        denyMessage: "❌ You need Admin role to use this command!"
      },
      kick: {
        permissionsOnly: ["KICK_MEMBERS"]
      }
    },
    
    slashes: {
      // Slash command permissions coming soon
    }
  }
});
```

### Write Your Commands (No Permission Checks Needed!)

```javascript
// commands/prefix/ban.js
export default {
  name: 'ban',
  description: 'Ban a user',
  run: async (ctx) => {
    // No permission check needed - it's automatic!
    // If user doesn't have permission, they never reach here
    
    await ctx.reply('User banned!');
  }
};
```

**That's it!** ✨ Permissions are checked automatically. Users without permission will see the deny message from config.

---

## 📚 Usage Modes

### Mode 1: Global Auto-Check (Recommended) ⭐

**Use `setupPermsyForPrefix()` for automatic permission checking on ALL commands.**

```javascript
import { setupPermsyForPrefix } from '@permsy/adapter-nextgen';

setupPermsyForPrefix(app, permsy);

// Load commands - they're automatically protected
app.prefix({ prefix: '!', folder: './commands/prefix' });
```

**Advantages:**
- ✅ One-line setup
- ✅ No code in commands
- ✅ All config in `permsy.config.js`
- ✅ Clean and maintainable

**Your commands:**
```javascript
export default {
  name: 'admin',
  run: async (ctx) => {
    // No permission check - automatic!
    await ctx.reply('Admin panel opened');
  }
};
```

---

### Mode 2: Per-Command Manual Check

**Use `withPermsy()` when you want to protect SPECIFIC commands only.**

```javascript
import { withPermsy } from '@permsy/adapter-nextgen';

export default {
  name: 'sensitive',
  description: 'Sensitive command with manual check',
  run: withPermsy('sensitive', async (ctx) => {
    // Check permission manually
    if (!await ctx.permsy.isAllowed(ctx)) return;
    
    // Custom logic after permission check
    await ctx.reply('Access granted!');
  })
};
```

**When to use:**
- Need custom logic after permission check
- Only specific commands need protection
- Want to add additional validation

**Setup:**
```javascript
import { NextgenAdapter, attachPermsy } from '@permsy/adapter-nextgen';

const permsy = new Permsy({
  configDir: './config',
  fileName: 'permsy.config.js',
  adapter: new NextgenAdapter()
});

// Manual mode - attach permsy to context
app.use(attachPermsy(permsy));
```

---

### Mode 3: Plugin Mode (Alternative Global)

**Use `PermsyPlugin` for middleware-based automatic checking.**

> **Note:** This mode may have limitations with Nextgen's command system. Use `setupPermsyForPrefix` instead for better compatibility.

```javascript
import { PermsyPlugin } from '@permsy/adapter-nextgen';

app.use(new PermsyPlugin(permsy));
```

---

## 🎯 API Reference

### `NextgenAdapter`

The core adapter that bridges Nextgen Context with Permsy.

```javascript
import { NextgenAdapter } from '@permsy/adapter-nextgen';

const adapter = new NextgenAdapter();

const permsy = new Permsy({
  configDir: './config',
  fileName: 'permsy.config.js',
  adapter: adapter
});
```

**Features:**
- Extracts user roles from `message.member.roles`
- Converts Discord permissions from bitfield
- Handles both slash and prefix commands
- Sends ephemeral deny messages

---

### `setupPermsyForPrefix(app, permsy)`

**RECOMMENDED:** Sets up global automatic permission checking for ALL prefix commands.

**Parameters:**
- `app` - Nextgen App instance
- `permsy` - Permsy instance

**Example:**
```javascript
import { setupPermsyForPrefix } from '@permsy/adapter-nextgen';

const app = new App({ intents: Intents.ALL });
const permsy = new Permsy({
  configDir: './config',
  fileName: 'permsy.config.js',
  adapter: new NextgenAdapter()
});

// Must be called BEFORE loading commands
setupPermsyForPrefix(app, permsy);

// Now load commands
app.prefix({ prefix: '!', folder: './commands/prefix' });
```

**Important:** Call `setupPermsyForPrefix` **BEFORE** `app.prefix()` to ensure all commands are wrapped.

---

### `withPermsy(commandName, handler)`

Wraps a single command handler to inject command name for Permsy checks.

**Parameters:**
- `commandName` - The command name (string)
- `handler` - The command handler function

**Example:**
```javascript
import { withPermsy } from '@permsy/adapter-nextgen';

export default {
  name: 'ban',
  run: withPermsy('ban', async (ctx) => {
    // Manual permission check
    if (!await ctx.permsy.isAllowed(ctx)) return;
    
    // Command logic
    await ctx.reply('User banned!');
  })
};
```

**Use case:** When you need manual control over specific commands while using global setup.

---

### `PermsyPlugin`

Middleware plugin for automatic permission checking.

**Example:**
```javascript
import { PermsyPlugin } from '@permsy/adapter-nextgen';

app.use(new PermsyPlugin(permsy));
```

**Note:** Due to Nextgen's architecture, `setupPermsyForPrefix` is recommended instead for better command name resolution.

---

## 🔧 Configuration Examples

### Simple Role-Based Access

```javascript
export default definePermissionConfig({
  defaultDenyMessage: "❌ Access denied!",
  
  commands: {
    prefixes: {
      admin: {
        rolesOnly: ["ADMIN_ROLE_ID"],
        denyMessage: "❌ Admin role required!"
      }
    }
  }
});
```

### Permission-Based Access

```javascript
export default definePermissionConfig({
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
});
```

### Multiple Requirements (OR Logic)

```javascript
export default definePermissionConfig({
  commands: {
    prefixes: {
      moderate: {
        rolesOnly: ["MODERATOR_ROLE_ID"],
        usersOnly: ["OWNER_USER_ID"],
        permissionsOnly: ["MODERATE_MEMBERS"]
        // User needs ANY ONE of these
      }
    }
  }
});
```

### Channel Restrictions

```javascript
export default definePermissionConfig({
  commands: {
    prefixes: {
      modlog: {
        channelsOnly: ["MOD_CHANNEL_ID"],
        rolesOnly: ["MODERATOR_ROLE_ID"]
      }
    }
  }
});
```

---

## 📝 Complete Example

**bot/index.js:**
```javascript
import { App, Intents } from 'discordjs-nextgen';
import { Permsy } from 'permsy';
import { NextgenAdapter, setupPermsyForPrefix } from '@permsy/adapter-nextgen';
import 'dotenv/config';

const app = new App({ intents: Intents.ALL });

const permsy = new Permsy({
  configDir: './config',
  fileName: 'permsy.config.js',
  adapter: new NextgenAdapter()
});

// Global auto-check - one line!
setupPermsyForPrefix(app, permsy);

// Load commands
app.prefix({ prefix: '!', folder: './commands/prefix' });
app.slash({ folder: './commands/slash' });

app.run(process.env.TOKEN);
```

**config/permsy.config.js:**
```javascript
import { definePermissionConfig } from 'permsy';

export default definePermissionConfig({
  defaultDenyMessage: "❌ You don't have permission!",
  
  commands: {
    prefixes: {
      ban: {
        rolesOnly: ["ADMIN_ROLE_ID"],
        denyMessage: "⛔ Admin role required!"
      },
      kick: {
        permissionsOnly: ["KICK_MEMBERS"]
      },
      help: {
        // Not listed = everyone can use
      }
    }
  }
});
```

**commands/prefix/ban.js:**
```javascript
export default {
  name: 'ban',
  description: 'Ban a user',
  run: async (ctx) => {
    // No permission check - automatic!
    await ctx.reply('User banned!');
  }
};
```

**commands/prefix/help.js:**
```javascript
export default {
  name: 'help',
  description: 'Help command',
  run: async (ctx) => {
    // Not in config = everyone can use
    await ctx.reply('Help menu...');
  }
};
```

---

## ❓ FAQ

### Do I need to check permissions in every command?

**No!** When using `setupPermsyForPrefix()`, permissions are checked automatically. You only write command logic.

### What if a command is not in the config?

Commands not listed in `permsy.config.js` are **allowed by default**. Only add commands that need restrictions.

### Can I mix protected and public commands?

Yes! Only add restricted commands to config. Other commands work normally.

### How do I protect all commands by default?

You would need to list all commands in config. Permsy uses an "allow by default" approach for commands not in config.

### Can I add custom logic after permission check?

Yes! Use `withPermsy()` for manual checks with custom logic:

```javascript
run: withPermsy('admin', async (ctx) => {
  if (!await ctx.permsy.isAllowed(ctx)) {
    // Custom denied logic
    console.log('Access denied');
    return;
  }
  
  // Custom allowed logic
  console.log('Access granted');
  await ctx.reply('Welcome!');
})
```

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📄 License

MIT © Ümit ULUSOY

---

## 🔗 Links

- [Permsy Core](https://github.com/Umit-Ulusoy/permsy)
- [Nextgen Framework](https://github.com/yourusername/nextgen)
- [Issues](https://github.com/Umit-Ulusoy/permsy-adapter-nextgen/issues)

---

# 🇹🇷 Turkish Documentation / Türkçe Dokümantasyon

[Nextgen](https://github.com/yourusername/nextgen) framework'ü için resmi [Permsy](https://github.com/Umit-Ulusoy/permsy) izin yönetim motoru adaptörü.

---

## 🚀 Hızlı Başlangıç

### Kurulum

```bash
npm install @permsy/adapter-nextgen permsy
```

### Temel Kurulum (Önerilen)

```javascript
import { App, Intents } from 'discordjs-nextgen';
import { Permsy } from 'permsy';
import { NextgenAdapter, setupPermsyForPrefix } from '@permsy/adapter-nextgen';

const app = new App({ intents: Intents.ALL });

// Permsy'yi başlat
const permsy = new Permsy({
  configDir: './config',
  fileName: 'permsy.config.js',
  adapter: new NextgenAdapter()
});

// TÜM prefix komutları için global otomatik kontrol - TEK SATIR!
setupPermsyForPrefix(app, permsy);

// Komutları yükle
app.prefix({ prefix: '!', folder: './commands/prefix' });
app.slash({ folder: './commands/slash' });

app.run(process.env.TOKEN);
```

### İzin Konfigürasyonu Oluştur

`./config/permsy.config.js` dosyası oluşturun:

```javascript
import { definePermissionConfig } from 'permsy';

export default definePermissionConfig({
  defaultDenyMessage: "❌ Bu komutu kullanma yetkin yok!",
  
  commands: {
    prefixes: {
      ban: {
        rolesOnly: ["ADMIN_ROL_ID"],
        denyMessage: "❌ Bu komutu kullanmak için Admin rolü gerekli!"
      },
      kick: {
        permissionsOnly: ["KICK_MEMBERS"]
      }
    },
    
    slashes: {
      // Slash komut izinleri yakında
    }
  }
});
```

### Komutlarınızı Yazın (İzin Kontrolü Gereksiz!)

```javascript
// commands/prefix/ban.js
export default {
  name: 'ban',
  description: 'Kullanıcıyı yasakla',
  run: async (ctx) => {
    // İzin kontrolü gerekmez - otomatik!
    // Kullanıcının izni yoksa buraya asla ulaşmaz
    
    await ctx.reply('Kullanıcı yasaklandı!');
  }
};
```

**Bu kadar!** ✨ İzinler otomatik kontrol edilir. İzni olmayan kullanıcılar config'teki reddetme mesajını görür.

---

## 📚 Kullanım Modları

### Mod 1: Global Otomatik Kontrol (Önerilen) ⭐

**TÜM komutlarda otomatik izin kontrolü için `setupPermsyForPrefix()` kullanın.**

```javascript
import { setupPermsyForPrefix } from '@permsy/adapter-nextgen';

setupPermsyForPrefix(app, permsy);

// Komutları yükle - otomatik korunuyorlar
app.prefix({ prefix: '!', folder: './commands/prefix' });
```

**Avantajlar:**
- ✅ Tek satır kurulum
- ✅ Komutlarda kod yok
- ✅ Tüm config `permsy.config.js`'te
- ✅ Temiz ve bakımı kolay

**Komutlarınız:**
```javascript
export default {
  name: 'admin',
  run: async (ctx) => {
    // İzin kontrolü yok - otomatik!
    await ctx.reply('Admin paneli açıldı');
  }
};
```

---

### Mod 2: Komut Bazında Manuel Kontrol

**Sadece BELİRLİ komutları korumak istediğinizde `withPermsy()` kullanın.**

```javascript
import { withPermsy } from '@permsy/adapter-nextgen';

export default {
  name: 'hassas',
  description: 'Manuel kontrollü hassas komut',
  run: withPermsy('hassas', async (ctx) => {
    // İzni manuel kontrol et
    if (!await ctx.permsy.isAllowed(ctx)) return;
    
    // İzin kontrolünden sonra özel mantık
    await ctx.reply('Erişim verildi!');
  })
};
```

**Ne zaman kullanılır:**
- İzin kontrolünden sonra özel mantık gerekli
- Sadece belirli komutların korunması gerekli
- Ek doğrulama eklemek istiyorsunuz

---

### Mod 3: Plugin Modu (Alternatif Global)

**Middleware tabanlı otomatik kontrol için `PermsyPlugin` kullanın.**

> **Not:** Bu modun Nextgen'in komut sistemiyle sınırlamaları olabilir. Daha iyi uyumluluk için `setupPermsyForPrefix` kullanın.

```javascript
import { PermsyPlugin } from '@permsy/adapter-nextgen';

app.use(new PermsyPlugin(permsy));
```

---

## 🎯 API Referansı

### `NextgenAdapter`

Nextgen Context'i Permsy ile birleştiren ana adaptör.

```javascript
import { NextgenAdapter } from '@permsy/adapter-nextgen';

const adapter = new NextgenAdapter();

const permsy = new Permsy({
  configDir: './config',
  fileName: 'permsy.config.js',
  adapter: adapter
});
```

**Özellikler:**
- `message.member.roles`'den kullanıcı rollerini çıkarır
- Discord yetkilerini bitfield'den dönüştürür
- Hem slash hem prefix komutları destekler
- Ephemeral reddetme mesajları gönderir

---

### `setupPermsyForPrefix(app, permsy)`

**ÖNERİLEN:** TÜM prefix komutları için global otomatik izin kontrolü kurar.

**Parametreler:**
- `app` - Nextgen App instance
- `permsy` - Permsy instance

**Örnek:**
```javascript
import { setupPermsyForPrefix } from '@permsy/adapter-nextgen';

const app = new App({ intents: Intents.ALL });
const permsy = new Permsy({
  configDir: './config',
  fileName: 'permsy.config.js',
  adapter: new NextgenAdapter()
});

// Komutları yüklemeden ÖNCE çağrılmalı
setupPermsyForPrefix(app, permsy);

// Şimdi komutları yükle
app.prefix({ prefix: '!', folder: './commands/prefix' });
```

**Önemli:** `setupPermsyForPrefix`'i `app.prefix()`'den **ÖNCE** çağırın ki tüm komutlar wrap edilsin.

---

### `withPermsy(commandName, handler)`

Tek bir komut handler'ını wrap ederek Permsy kontrolleri için komut adını inject eder.

**Parametreler:**
- `commandName` - Komut adı (string)
- `handler` - Komut handler fonksiyonu

**Örnek:**
```javascript
import { withPermsy } from '@permsy/adapter-nextgen';

export default {
  name: 'ban',
  run: withPermsy('ban', async (ctx) => {
    // Manuel izin kontrolü
    if (!await ctx.permsy.isAllowed(ctx)) return;
    
    // Komut mantığı
    await ctx.reply('Kullanıcı yasaklandı!');
  })
};
```

---

### `PermsyPlugin`

Otomatik izin kontrolü için middleware plugin.

**Örnek:**
```javascript
import { PermsyPlugin } from '@permsy/adapter-nextgen';

app.use(new PermsyPlugin(permsy));
```

**Not:** Nextgen'in mimarisi nedeniyle, daha iyi komut adı çözümlemesi için `setupPermsyForPrefix` önerilir.

---

## 📝 Tam Örnek

**bot/index.js:**
```javascript
import { App, Intents } from 'discordjs-nextgen';
import { Permsy } from 'permsy';
import { NextgenAdapter, setupPermsyForPrefix } from '@permsy/adapter-nextgen';
import 'dotenv/config';

const app = new App({ intents: Intents.ALL });

const permsy = new Permsy({
  configDir: './config',
  fileName: 'permsy.config.js',
  adapter: new NextgenAdapter()
});

// Global otomatik kontrol - tek satır!
setupPermsyForPrefix(app, permsy);

// Komutları yükle
app.prefix({ prefix: '!', folder: './commands/prefix' });
app.slash({ folder: './commands/slash' });

app.run(process.env.TOKEN);
```

**config/permsy.config.js:**
```javascript
import { definePermissionConfig } from 'permsy';

export default definePermissionConfig({
  defaultDenyMessage: "❌ Yetkin yok!",
  
  commands: {
    prefixes: {
      ban: {
        rolesOnly: ["ADMIN_ROL_ID"],
        denyMessage: "⛔ Admin rolü gerekli!"
      },
      kick: {
        permissionsOnly: ["KICK_MEMBERS"]
      },
      yardim: {
        // Listede değil = herkes kullanabilir
      }
    }
  }
});
```

**commands/prefix/ban.js:**
```javascript
export default {
  name: 'ban',
  description: 'Kullanıcıyı yasakla',
  run: async (ctx) => {
    // İzin kontrolü yok - otomatik!
    await ctx.reply('Kullanıcı yasaklandı!');
  }
};
```

---

## ❓ Sık Sorulan Sorular

### Her komutta izin kontrolü yazmam gerekir mi?

**Hayır!** `setupPermsyForPrefix()` kullandığınızda izinler otomatik kontrol edilir. Sadece komut mantığınızı yazarsınız.

### Config'te olmayan komutlar ne olur?

`permsy.config.js`'te listelenmeyen komutlar **varsayılan olarak izin verilir**. Sadece kısıtlamak istediğiniz komutları ekleyin.

### Korumalı ve genel komutları karıştırabilir miyim?

Evet! Sadece kısıtlı komutları config'e ekleyin. Diğer komutlar normal çalışır.

### Tüm komutları varsayılan olarak nasıl korurım?

Tüm komutları config'te listelemeniz gerekir. Permsy, config'te olmayan komutlar için "varsayılan izin ver" yaklaşımı kullanır.

---

## 🤝 Katkıda Bulunma

Katkılar memnuniyetle karşılanır! Pull Request göndermekten çekinmeyin.

---

## 📄 Lisans

MIT © Ümit ULUSOY

---

## 🔗 Bağlantılar

- [Permsy Core](https://github.com/Umit-Ulusoy/permsy)
- [Nextgen Framework](https://github.com/yourusername/nextgen)
- [Sorunlar](https://github.com/Umit-Ulusoy/permsy-adapter-nextgen/issues)
