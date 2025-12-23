export class StatusBar {
    private lastSync!: string;    
    constructor(private el: HTMLElement) {
        this.lastSync = "~";
    }

    setLastSync(time?: string) {
        if (time?.length) this.lastSync = time;
        this.el.setText(`Last obsync: ${this.lastSync}`);
    }

    setSyncing() {
        this.el.setText(`Obsyncing...`);
    }
}