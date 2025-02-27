import fs from "fs";

export class Memento{
    private cache: Map<string, any>;
    private dirty: boolean = false;

    constructor(private storagePath: string) {
        this.cache = new Map<string, any>();

        // Initialize cache from file
        if (fs.existsSync(this.storagePath)) {
            try {
                const data = JSON.parse(fs.readFileSync(this.storagePath, 'utf8'));
                this.cache = new Map(Object.entries(data));
            } catch (error) {
                this.cache = new Map();
            }
        }
    }

    private async flushIfNeeded(): Promise<void> {
        if (this.dirty) {
            const data = Object.fromEntries(this.cache);
            await fs.promises.writeFile(this.storagePath, JSON.stringify(data, null, 2), 'utf8');
            this.dirty = false;
        }
    }

    get<T>(key: string): T | undefined;
    get<T>(key: string, defaultValue: T): T;
    get(key: string, defaultValue?: any) {
        return this.cache.has(key) ? this.cache.get(key) : defaultValue;
    }

    update(key: string, value: any): Thenable<void> {
        const currentValue = this.cache.get(key);
        if (currentValue !== value) {
            this.cache.set(key, value);
            this.dirty = true;
            return this.flushIfNeeded();
        }
        return Promise.resolve();
    }

    keys(): readonly string[] {
        return Array.from(this.cache.keys());
    }

    clear(): Thenable<void> {
        this.cache.clear();
        this.dirty = true;
        return this.flushIfNeeded();
    }

    remove(key: string): Thenable<void> {
        this.cache.delete(key);
        this.dirty = true;
        return this.flushIfNeeded();
    }

    getAll() {
        return Object.fromEntries(this.cache);
    }


}