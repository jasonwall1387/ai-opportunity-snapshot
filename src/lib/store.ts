import type { Snapshot, StatusRecord } from './types.ts';

export interface SnapshotStore {
  putSnapshot(slug: string, snapshot: Snapshot): Promise<void>;
  getSnapshot(slug: string): Promise<Snapshot | null>;
  putStatus(slug: string, status: StatusRecord): Promise<void>;
  getStatus(slug: string): Promise<StatusRecord | null>;
}

export class MemoryStore implements SnapshotStore {
  private readonly snapshots = new Map<string, Snapshot>();
  private readonly statuses = new Map<string, StatusRecord>();

  async putSnapshot(slug: string, snapshot: Snapshot): Promise<void> {
    this.snapshots.set(slug, snapshot);
  }

  async getSnapshot(slug: string): Promise<Snapshot | null> {
    return this.snapshots.get(slug) ?? null;
  }

  async putStatus(slug: string, status: StatusRecord): Promise<void> {
    this.statuses.set(slug, status);
  }

  async getStatus(slug: string): Promise<StatusRecord | null> {
    return this.statuses.get(slug) ?? null;
  }
}

export interface KvLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

const STATUS_TTL_SECONDS = 3_600;

function parseStored<T>(raw: string | null): T | null {
  return raw ? JSON.parse(raw) : null;
}

export class KvStore implements SnapshotStore {
  constructor(private readonly kv: KvLike) {}

  async putSnapshot(slug: string, snapshot: Snapshot): Promise<void> {
    await this.kv.put(`snap:${slug}`, JSON.stringify(snapshot));
  }

  async getSnapshot(slug: string): Promise<Snapshot | null> {
    return parseStored<Snapshot>(await this.kv.get(`snap:${slug}`));
  }

  async putStatus(slug: string, status: StatusRecord): Promise<void> {
    await this.kv.put(`status:${slug}`, JSON.stringify(status), {
      expirationTtl: STATUS_TTL_SECONDS,
    });
  }

  async getStatus(slug: string): Promise<StatusRecord | null> {
    return parseStored<StatusRecord>(await this.kv.get(`status:${slug}`));
  }
}

export class FileStore implements SnapshotStore {
  private readonly memory = new MemoryStore();

  constructor(private readonly directory: string) {}

  async putSnapshot(slug: string, snapshot: Snapshot): Promise<void> {
    const [{ mkdir, writeFile }, { join }] = await Promise.all([
      import('node:fs/promises'),
      import('node:path'),
    ]);
    await mkdir(this.directory, { recursive: true });
    await writeFile(
      join(this.directory, `${slug}-snapshot.json`),
      JSON.stringify(snapshot, null, 2),
      'utf8',
    );
    await this.memory.putSnapshot(slug, snapshot);
  }

  async getSnapshot(slug: string): Promise<Snapshot | null> {
    return this.memory.getSnapshot(slug);
  }

  async putStatus(slug: string, status: StatusRecord): Promise<void> {
    console.log(`[${slug}] ${status.stage}${status.error ? ` - ${status.error}` : ''}`);
    await this.memory.putStatus(slug, status);
  }

  async getStatus(slug: string): Promise<StatusRecord | null> {
    return this.memory.getStatus(slug);
  }
}
