export class SyncInProgressError extends Error {
    constructor() {
        super("SYNC_IN_PROGRESS");
        this.name = "SyncInProgressError";
    }
}

export class Mutex {
    private locked = false;
    
    isLocked(): boolean {
        return this.locked;
    }

    async runExclusive<T>(fn: () => Promise<T>): Promise<T> {
        if (this.locked) throw new SyncInProgressError();
        this.locked = true;
        try {
            return await fn();
        } finally {
            this.locked = false;
        }
    }
}