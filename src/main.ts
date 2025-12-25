import {App, Modal, Notice, Plugin, FileSystemAdapter, Setting, moment, TFile} from 'obsidian';
import {DEFAULT_SETTINGS, ObsyncSettings, ObsyncSettingTab} from "./settings";
import { SyncService } from 'sync/syncService';
import { GitClient } from 'sync/gitClient';
import { StatusBar } from 'ui/statusBar';

export default class Obsync extends Plugin {
	settings: ObsyncSettings;

	private syncService!: SyncService;
	private statusBar!: StatusBar;

	async onload() {
		await this.loadSettings();

		const vaultPath = this.getVaultPath();
		const git = new GitClient(vaultPath);
		this.syncService = new SyncService(git, this.currentTime.bind(this));

		this.statusBar = new StatusBar(this.addStatusBarItem());
		if (this.settings.lastSyncAt) 
			this.statusBar.setLastSync(this.settings.lastSyncAt);
		else this.statusBar.setLastSync();

		this.addRibbonIcon('github', 'Obsync', async (evt: MouseEvent) => {
			await this.onSyncClick();
		}); 

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new ObsyncSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		// this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
		// 	new Notice("Click");
		// });

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		// this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {
	}

	async loadSettings(): Promise<void> {
		const loaded = (await this.loadData()) as Partial<ObsyncSettings> | null;
		this.settings = { ...DEFAULT_SETTINGS, ...(loaded ?? {}) };
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	private async onSyncClick(): Promise<void> {
		if (this.syncService.isSyncing()) {
			new Notice("Obsync is already running...")
			return;
		}

		const yesSync = await this.getConfirm();
		if (!yesSync) return;

		new Notice("Starting obsync.");
		this.statusBar.setSyncing();
		let okSync = false;

		await this.generateREADME();

		try {
			const resp = await this.syncService.doSync();
			
			if (resp.kind == "no-changes") 
				new Notice("No changes to obsync.")
			else if (resp.kind == "remote-ahead")
				new Notice("Remote has new commits. Pull/rebase manually first.")
			else {
				new Notice("Obsync success.")
				okSync = true;
			}
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			new Notice(`Obsync failed: ${msg}`);
		}

		if (okSync) {
			const now = this.currentTime();
			this.statusBar.setLastSync(now);
			this.settings.lastSyncAt = now;
			await this.saveSettings();
		} else this.statusBar.setLastSync();
	}

	private getVaultPath(): string {
		const adapter = this.app.vault.adapter;
		if (adapter instanceof FileSystemAdapter)
			return adapter.getBasePath();
		throw new Error("Adapter is not an instance of FileSystemAdapter");
	}

	private currentTime(): string {
		return moment().format("HH:mm:ss YYYY-MM-DD");
  	}

	private async getConfirm(): Promise<boolean> {
		return new Promise((resolve) => {
			new ConfirmModal(this.app, resolve).open();
		});
	}

	private async generateREADME(): Promise<void> {
		const configFilePath = "target_paths.json";
		const outputFile = "README.md";
		const adapter = this.app.vault.adapter;

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

		let content = `### Last obsync: ${this.settings.lastSyncAt}\n`;
		
		for (const path of targetPaths) {
			const file = this.app.vault.getAbstractFileByPath(path);
			if (file instanceof TFile) {
				let now = await this.app.vault.read(file);
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

class ConfirmModal extends Modal { // modal.open() is not async
	private chosen = false;
	constructor(app: App, onSubmit: (ok: boolean) => void) {
		super(app);
		this.setTitle("Obsync");
		this.contentEl.createEl("p", { text: "U sure bud?" });

		const done = (ok: boolean) => {
			if (this.chosen) return;
			this.chosen = true;
			onSubmit(ok);
			this.close();
		}

		new Setting(this.contentEl)
			.addButton((btn) =>
			  btn
				.setButtonText("OK")
				.setCta()
				.onClick(() => done(true))
			)
			.addButton((btn) =>
			  btn
				.setButtonText("Nah")
				.onClick(() => done(false))
			);
		this.onClose = () => done(false);
	}

	// onOpen() {
	// 	let {contentEl} = this;
	// 	contentEl.setText('Woah!');
	// }

	// onClose() {
	// 	const {contentEl} = this;
	// 	contentEl.empty();
	// }
}