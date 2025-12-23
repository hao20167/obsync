import {App, PluginSettingTab, Setting} from "obsidian";
import Obsync from "./main";

export interface ObsyncSettings {
	mySetting: string;
	lastSyncAt?: string;
}

export const DEFAULT_SETTINGS: ObsyncSettings = {
	mySetting: 'default',
	lastSyncAt: undefined,
}

export class ObsyncSettingTab extends PluginSettingTab {
	plugin: Obsync;

	constructor(app: App, plugin: Obsync) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Settings #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
		// new Setting(containerEl)
		// 	.setName('Settings #2')
		// 	.setDesc('Last obsync')
		// 	.addText(text => text
		// 		.setValue(this.plugin.settings.lastSyncAt ?? "none")
		// 	);
	}
}
