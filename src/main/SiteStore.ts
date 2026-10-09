import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { safeStorage } from 'electron';
import type { Site, SiteInput } from '../shared/types';

/** On-disk shape — password stored encrypted when OS keychain encryption is available. */
interface StoredSite {
  id: string;
  name: string;
  host: string;
  commandPort: number;
  eventPort: number;
  username?: string;
  /** Base64 ciphertext from safeStorage.encryptString. */
  passwordEnc?: string;
  defaultProject?: string;
  defaultNetwork?: string;
}

export type SitePersistMeta = {
  /** True when OS encryption can store passwords. */
  encryptionAvailable: boolean;
  /** True when a password was omitted because encryption was unavailable. */
  passwordDropped?: boolean;
};

// Persists the list of saved C-Gate sites as JSON in the Electron userData
// directory. Passwords use Electron safeStorage when available; otherwise they
// are not written to disk.
export class SiteStore {
  constructor(private readonly filePath: string) {}

  list(): Site[] {
    return this.read().map(toPublic);
  }

  /** Whether the OS can encrypt site passwords for persistence. */
  encryptionAvailable(): boolean {
    try {
      return safeStorage.isEncryptionAvailable();
    } catch {
      return false;
    }
  }

  add(input: SiteInput): Site[] {
    const sites = this.read();
    const { stored } = toStored(input);
    sites.push({ id: crypto.randomUUID(), ...stored });
    this.write(sites);
    return sites.map(toPublic);
  }

  update(updated: Site): Site[] {
    const sites = this.read().map((s) => {
      if (s.id !== updated.id) return s;
      const { stored } = toStored(updated, s);
      return { ...stored, id: s.id };
    });
    this.write(sites);
    return sites.map(toPublic);
  }

  remove(id: string): Site[] {
    const sites = this.read().filter((s) => s.id !== id);
    this.write(sites);
    return sites.map(toPublic);
  }

  private read(): StoredSite[] {
    try {
      const parsed = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(isStoredSite);
    } catch {
      return [];
    }
  }

  private write(sites: StoredSite[]): void {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    const tmp = `${this.filePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(sites, null, 2), 'utf8');
    fs.renameSync(tmp, this.filePath);
  }
}

function toStored(
  s: SiteInput | Site,
  previous?: StoredSite,
): { stored: Omit<StoredSite, 'id'>; passwordDropped: boolean } {
  let passwordDropped = false;
  const username =
    s.username != null && String(s.username).trim()
      ? String(s.username).trim().slice(0, 128)
      : undefined;

  let passwordEnc: string | undefined;
  const incomingPassword = s.password;
  if (incomingPassword != null && String(incomingPassword).length > 0) {
    if (canEncrypt()) {
      passwordEnc = encrypt(String(incomingPassword).slice(0, 256));
    } else {
      passwordDropped = true;
      passwordEnc = undefined;
    }
  } else if (incomingPassword === '' || incomingPassword === undefined) {
    // Empty string clears; undefined keeps prior encrypted password on update when
    // the renderer sends a placeholder-clear contract — SiteForm always sends the
    // current field value, so empty clears and a re-typed value replaces.
    if (incomingPassword === '') {
      passwordEnc = undefined;
    } else if (previous?.passwordEnc) {
      passwordEnc = previous.passwordEnc;
    }
  }

  const defaultProject =
    s.defaultProject != null && String(s.defaultProject).trim()
      ? String(s.defaultProject).trim()
      : undefined;
  const defaultNetwork =
    s.defaultNetwork != null && String(s.defaultNetwork).trim()
      ? String(s.defaultNetwork).trim()
      : undefined;

  return {
    stored: {
      name: String(s.name),
      host: String(s.host),
      commandPort: Number(s.commandPort),
      eventPort: Number(s.eventPort),
      username,
      passwordEnc,
      defaultProject,
      defaultNetwork,
    },
    passwordDropped,
  };
}

function toPublic(s: StoredSite): Site {
  return {
    id: s.id,
    name: s.name,
    host: s.host,
    commandPort: s.commandPort,
    eventPort: s.eventPort,
    username: s.username,
    password: s.passwordEnc ? decrypt(s.passwordEnc) : undefined,
    defaultProject: s.defaultProject,
    defaultNetwork: s.defaultNetwork,
  };
}

function canEncrypt(): boolean {
  try {
    return safeStorage.isEncryptionAvailable();
  } catch {
    return false;
  }
}

function encrypt(plain: string): string {
  return safeStorage.encryptString(plain).toString('base64');
}

function decrypt(enc: string): string | undefined {
  try {
    const buf = Buffer.from(enc, 'base64');
    return safeStorage.decryptString(buf);
  } catch {
    return undefined;
  }
}

function isStoredSite(v: unknown): v is StoredSite {
  const s = v as Partial<StoredSite>;
  return (
    !!s &&
    typeof s.id === 'string' &&
    typeof s.name === 'string' &&
    typeof s.host === 'string' &&
    typeof s.commandPort === 'number' &&
    typeof s.eventPort === 'number'
  );
}
