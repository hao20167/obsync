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
				now = now
						.replace(/\r\n/g, '\n')           		// Normalize Windows line endings
						.replace(/\n{2,}/g, '\n\n')       		// Keep existing paragraph breaks as just two
						.replace(/(?<!\n)\n(?!\n)/g, '\n\n'); 	// Convert single breaks to double
				content += `\n\n---\n\n`;
				content += `# File name: ${file.basename}\n\n`;
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