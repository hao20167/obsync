export type ExecResult = {
	stdout: string;
	stderr: string;
	code: number;
};

export type SyncResult =
	| { kind: "success" }
	| { kind: "no-changes" }
	| { kind: "remote-ahead" };

export type DiffState = "none" | "local" | "ahead-only" | "remote-ahead";