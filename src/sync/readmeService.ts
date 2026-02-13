import {Notice, Vault, TFile} from "obsidian";
import { ObsyncSettings } from "settings";

export class ReadmeService {
    constructor(private myVault: Vault, private mySettings: ObsyncSettings) {}

    async generateREADME(): Promise<void> {
		const configFilePath = "target_paths.json";
		const outputFile = "README.md";
		const adapter = this.myVault.adapter;

		if (!(await adapter.exists(configFilePath))) {
			new Notice(`Config file '${configFilePath}' not found.`);
			return;
		}

		let targetPaths: string[] = [];
		try {
			const str = await adapter.read(configFilePath);
			targetPaths = JSON.parse(str) as string[];
			if (!Array.isArray(targetPaths)) {
				new Notice(`'${configFilePath}' must contain a JSON array of file paths.`);
				return;
			}
		} catch {
			new Notice(`Failed to parse json from '${configFilePath}'.`);
			return;
		}

		let content = `### Last obsync: ${this.mySettings.lastSyncAt}\n`;
		
		for (const path of targetPaths) {
			const file = this.myVault.getAbstractFileByPath(path);
			if (file instanceof TFile) {
				let now = await this.myVault.read(file);

				// 1) normalize line endings
				now = now.replace(/\r\n?/g, "\n");
				// 2) protect markdown tables
				const TABLE_BLOCK_RE = /(^\s*\|.*\|\s*\n^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*\n(?:^\s*\|.*\|\s*\n?)*)/gm;
				const tables: string[] = [];
					now = now.replace(TABLE_BLOCK_RE, (m) => {
					tables.push(m);
					return `__TABLE_${tables.length - 1}__`;
				});
				now = now
						.replace(/\n{2,}/g, "\n\n")
						.replace(/(?<!\n)\n(?!\n)/g, "\n\n");
				// 3) restore tables (không đổi format table)
				now = now.replace(/__TABLE_(\d+)__/g, (full, idxStr) => {
					const idx = Number(idxStr);
					return tables[idx] ?? full; // nếu thiếu thì giữ nguyên token
				});
				
				content += now;
			} else {
				new Notice(`File '${path}' not found.`);
			}
		}

		try {
			await adapter.write(outputFile, content);
			new Notice(`Done generating '${outputFile}'`);
		} catch {
			new Notice(`Failed to write '${outputFile}'`);	
		}
	}
}