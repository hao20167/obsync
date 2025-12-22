import type { ExecResult } from "./types"

export class GitClient {
    constructor(private cwd: string) {}

    private execGit(args: string[]): Promise<ExecResult> {
        return new Promise((resolve, reject) => {
            const { spawn } = require("child_process") as typeof import("child_process");

            const resp = spawn("git", args, {cwd: this.cwd});
            
            let stdout = "";
            let stderr = "";

            resp.stdout.on("data", (d: Buffer) => (stdout += d.toString()));
            resp.stderr.on("data", (d: Buffer) => (stderr += d.toString()));
            resp.on("error", (e: Error) => reject(e));

            resp.on("close", (code: number) => {
                resolve({
                    stdout: stdout.trim(),
                    stderr: stderr.trim(),
                    code: code ?? 0,
                })
            });
        });
    }

    private async ok(args: string[], hint?: string): Promise<string> {
        const resp = await this.execGit(args);
        if (resp.code != 0) {
            return (hint ?? resp.stderr ?? `git ${args.join(' ')} failed`);
        }
        return resp.stdout;
    }

    async getStatusPorcelain(): Promise<string> {
        return await this.ok(["status", "--porcelain"]);
    }

	async ensureRepo(): Promise<void> {
		await this.ok(
			["rev-parse", "--is-inside-work-tree"],
			"Not a git repository (vault folder is not initialized with git)."
		);
	}

	async fetchOrigin(): Promise<void> {
		await this.ok(["fetch", "--prune", "origin"], "Failed to fetch from origin.");
	}

    async aheadBehind(): Promise<{ahead: number; behind: number}> {
        const aheadStr = await this.ok(["rev-list", "--count", "@{u}..HEAD"]);
        const behindStr = await this.ok(["rev-list", "--count", "HEAD..@{u}"]);
        return {
        ahead: Number.parseInt(aheadStr, 10) || 0,
        behind: Number.parseInt(behindStr, 10) || 0,
        };
    }

    async addAll(): Promise<void> {
        await this.ok(["add", "."]);
    }

    async commit(msg: string): Promise<void> {
        await this.ok(["commit", "-m", msg], "Commit failed.");
    }

    async pushHead(): Promise<void> {
        await this.ok(["push", "origin", "HEAD"], "Push failed.");
    }
}