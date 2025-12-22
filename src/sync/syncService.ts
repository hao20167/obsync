import { promises } from "dns";
import { GitClient } from "./gitClient";
import { Mutex } from "./mutex"
import type { SyncResult, DiffState } from "./types";

export class SyncService {
    private mutex = new Mutex();

    constructor(private git: GitClient, private currentTime: () => string) {}

    isSyncing(): boolean {
        return this.mutex.isLocked();
    }

    private async getDiffState(): Promise<DiffState> {
        await this.git.ensureRepo();
        await this.git.fetchOrigin();

        const porcelain = await this.git.getStatusPorcelain();
        if (porcelain.length > 0) return "local"; // new untracked files
        
        const {ahead, behind} = await this.git.aheadBehind();
        
        if (behind > 0) return "remote-ahead";
        if (ahead > 0) return "ahead-only";

        return "none";
    }

    async doSync(): Promise<SyncResult> {
        return await this.mutex.runExclusive(async () => {
            const diff = await this.getDiffState();

            if (diff == "none") return { kind: "no-changes" };

            if (diff == "remote-ahead")
                return { kind: "remote-ahead" };

            if (diff == "local") {
                await this.git.addAll();
                await this.git.commit(`Obsync ${this.currentTime()}`);
            }
            
            await this.git.pushHead();
            return { kind: "success"};
        });
    }
}