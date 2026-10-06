import fs from 'node:fs';
import os from 'node:os';
import { getDb } from '../db/index.js';
import { CONFIG } from '../config.js';

export class MetricsService {
  static getSystemMetrics(): any {
    const db = getDb();
    const mem = process.memoryUsage();

    let dbSize = 0;
    try {
      if (fs.existsSync(CONFIG.DATABASE_PATH)) {
        const stats = fs.statSync(CONFIG.DATABASE_PATH);
        dbSize = stats.size;
      }
    } catch {
      // ignore
    }

    const counts = {
      users: (db.prepare(`SELECT COUNT(*) as count FROM users`).get() as any)?.count || 0,
      projects: (db.prepare(`SELECT COUNT(*) as count FROM projects`).get() as any)?.count || 0,
      tasks: (db.prepare(`SELECT COUNT(*) as count FROM tasks`).get() as any)?.count || 0,
      comments: (db.prepare(`SELECT COUNT(*) as count FROM comments`).get() as any)?.count || 0,
      activity_events: (db.prepare(`SELECT COUNT(*) as count FROM activity_events`).get() as any)?.count || 0,
      saved_filters: (db.prepare(`SELECT COUNT(*) as count FROM saved_filters`).get() as any)?.count || 0,
    };

    return {
      status: 'healthy',
      app: 'TaskForge SaaS Platform',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      process: {
        uptime_seconds: Math.floor(process.uptime()),
        pid: process.pid,
        node_version: process.version,
        platform: process.platform,
        arch: process.arch,
      },
      memory: {
        rss_bytes: mem.rss,
        heap_total_bytes: mem.heapTotal,
        heap_used_bytes: mem.heapUsed,
        external_bytes: mem.external,
        rss_mb: (mem.rss / (1024 * 1024)).toFixed(2),
        heap_used_mb: (mem.heapUsed / (1024 * 1024)).toFixed(2),
      },
      system: {
        total_memory_mb: (os.totalmem() / (1024 * 1024)).toFixed(0),
        free_memory_mb: (os.freemem() / (1024 * 1024)).toFixed(0),
        cpu_count: os.cpus().length,
        load_avg: os.loadavg(),
      },
      database: {
        path: CONFIG.DATABASE_PATH,
        size_bytes: dbSize,
        size_kb: (dbSize / 1024).toFixed(2),
        journal_mode: (db.prepare(`PRAGMA journal_mode`).get() as any)?.journal_mode || 'unknown',
        foreign_keys: (db.prepare(`PRAGMA foreign_keys`).get() as any)?.foreign_keys === 1,
        table_counts: counts,
      },
    };
  }
}
