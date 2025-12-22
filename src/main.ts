import {App, Editor, MarkdownView, Modal, Notice, Plugin, FileSystemAdapter} from 'obsidian';
import {DEFAULT_SETTINGS, ObsyncSettings, ObsyncSettingTab} from "./settings";
import { SyncService } from 'sync/syncService';
import { GitClient } from 'sync/gitClient';

export default class Obsync extends Plugin {
	settings: ObsyncSettings;

	private syncService!: SyncService;

	async onload() {
		await this.loadSettings();

		const vaultPath = this.getVaultPath();
		const git = new GitClient(vaultPath);
		this.syncService = new SyncService(git, this.currentTime);

		this.addRibbonIcon('github', 'Obsync', async (evt: MouseEvent) => {
			await this.onSyncClick();
		});

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Last obsync: 22:59 12-20-2026');

		// This adds a simple command that can be triggered anywhere
		// this.addCommand({
		// 	id: 'open-modal-simple',
		// 	name: 'Open modal (simple)',
		// 	callback: () => {
		// 		new ObsyncModal(this.app).open();
		// 	}
		// });
		// This adds an editor command that can perform some operation on the current editor instance
		// this.addCommand({
		// 	id: 'replace-selected',
		// 	name: 'Replace selected content',
		// 	editorCallback: (editor: Editor, view: MarkdownView) => {
		// 		editor.replaceSelection('Sample editor command');
		// 	}
		// });
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		// this.addCommand({
		// 	id: 'open-modal-complex',
		// 	name: 'Open modal (complex)',
		// 	checkCallback: (checking: boolean) => {
		// 		// Conditions to check
		// 		const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
		// 		if (markdownView) {
		// 			// If checking is true, we're simply "checking" if the command can be run.
		// 			// If checking is false, then we want to actually perform the operation.
		// 			if (!checking) {
		// 				new ObsyncModal(this.app).open();
		// 			}

		// 			// This command will only show up in Command Palette when the check function returns true
		// 			return true;
		// 		}
		// 		return false;
		// 	}
		// });

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new ObsyncSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		// this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
		// 	new Notice("Click");
		// });

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));

	}

	onunload() {
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<ObsyncSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	private async onSyncClick(): Promise<void> {
		new Notice("Starting obsync1");
		if (this.syncService.isSyncing()) 
			new Notice("Obsync is already running...")
		new Notice("Starting obsync");

		try {
			const resp = await this.syncService.doSync();
			
			if (resp.kind == "no-changes") 
				new Notice("No changes to sync.")
			else if (resp.kind == "remote-ahead")
				new Notice("Remote has new commits. Pull/rebase manually first.")
			else {
				new Notice("Obsync success.")
			}
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			new Notice(`Obsync failed: ${msg}`);
		}
	}

	private getVaultPath(): string {
		const adapter = this.app.vault.adapter;
		if (adapter instanceof FileSystemAdapter)
			return adapter.getBasePath();
		throw new Error("Adapter is not an instance of FileSystemAdapter");
	}

	private currentTime() {
		const m = (window as any).moment;
		return m ? m().format("HH:mm:ss YYYY-MM-DD") : new Date().toLocaleString();
  	}
}

class ObsyncModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		let {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}
