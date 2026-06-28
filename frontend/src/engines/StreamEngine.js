/**
 * StreamEngine
 * ----------------------------------------------------------------------
 * The single source of truth for telemetry rows. Wraps window.initializeRpaStream
 * and converts its push-based callback firehose into a controllable,
 * pause-aware ingestion pipeline.
 */

const CSV_PATH = '/rpa_database_2026.csv';

export class StreamEngine {
  constructor() {
    this.rows = new Map();
    this.isPaused = false;
    this.pendingQueue = new Map();
    this.queuedEventCount = 0;
    this.subscribers = new Set();
    this.stats = {
      totalRowsStreamed: 0,
      totalTicks: 0,
      lastTickAt: 0,
      lastTickSize: 0,
    };
    this._initialized = false;
    this._onReadyCallbacks = [];
  }

  start() {
    // FIX: Reset _initialized so HMR / re-mount works correctly.
    // If already initialized AND rows exist, we're truly live — skip.
    // If initialized but rows are empty (HMR reset the module singleton
    // but dataStream.js already ran), force a re-init.
    if (this._initialized && this.rows.size > 0) return;

    this._initialized = true;

    if (typeof window === 'undefined' || typeof window.initializeRpaStream !== 'function') {
      console.error('[StreamEngine] window.initializeRpaStream is not available — is dataStream.js loaded?');
      return;
    }

    console.log('[StreamEngine] Calling window.initializeRpaStream...');
    window.initializeRpaStream((incomingBatch) => this._handleBatch(incomingBatch), CSV_PATH);
  }

  _handleBatch(incomingBatch) {
    if (!Array.isArray(incomingBatch) || incomingBatch.length === 0) return;

    this.stats.totalTicks += 1;
    this.stats.lastTickAt = performance.now();
    this.stats.lastTickSize = incomingBatch.length;
    this.stats.totalRowsStreamed += incomingBatch.length;

    const isFirstBatch = this.rows.size === 0;

    for (const row of incomingBatch) {
      const key = String(row.project_id);
      const prevRow = this.rows.get(key);
      const nextRow = prevRow ? { ...prevRow, ...row } : { ...row };

      this.rows.set(key, nextRow);

      if (this.isPaused) {
        this.pendingQueue.set(key, nextRow);
        this.queuedEventCount += 1;
      }
    }

    // Resolve onReady() promises after first batch
    if (isFirstBatch && this._onReadyCallbacks.length > 0) {
      for (const cb of this._onReadyCallbacks) cb();
      this._onReadyCallbacks = [];
    }

    if (!this.isPaused) {
      this._notify({
        type: isFirstBatch ? 'seed' : 'tick',
        changedKeys: incomingBatch.map((r) => String(r.project_id)),
        queueDepth: 0,
      });
    } else {
      this._notify({ type: 'buffering', queueDepth: this.queuedEventCount });
    }
  }

  onReady() {
    return new Promise((resolve) => {
      if (this.rows.size > 0) {
        resolve();
        return;
      }
      this._onReadyCallbacks.push(resolve);
    });
  }

  pause() {
    if (this.isPaused) return;
    this.isPaused = true;
    this._notify({ type: 'pause-state', paused: true, queueDepth: this.queuedEventCount });
  }

  resume() {
    if (!this.isPaused) return;
    this.isPaused = false;
    const flushedKeys = Array.from(this.pendingQueue.keys());
    const flushedEventCount = this.queuedEventCount;
    this.pendingQueue.clear();
    this.queuedEventCount = 0;

    this._notify({
      type: 'resume-flush',
      changedKeys: flushedKeys,
      flushedEventCount,
      queueDepth: 0,
    });
  }

  togglePause() {
    if (this.isPaused) {
      this.resume();
    } else {
      this.pause();
    }
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  _notify(payload) {
    for (const cb of this.subscribers) cb(payload);
  }

  getRow(projectId) {
    return this.rows.get(String(projectId));
  }

  getAllRows() {
    return Array.from(this.rows.values());
  }

  getStats() {
    return { ...this.stats, queueDepth: this.queuedEventCount, isPaused: this.isPaused };
  }
}

export const streamEngine = new StreamEngine();