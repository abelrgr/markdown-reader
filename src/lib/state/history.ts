export interface Location {
  path: string;
  anchor: string | null;
  scrollTop: number;
}

export class NavHistory {
  private entries: Location[] = [];
  private index = -1;

  push(location: Location): void {
    const current = this.entries[this.index];
    if (current && current.path === location.path && current.anchor === location.anchor) {
      this.entries[this.index] = { ...location };
      return;
    }
    this.entries = this.entries.slice(0, this.index + 1);
    this.entries.push({ ...location });
    if (this.entries.length > 100) this.entries.shift();
    this.index = this.entries.length - 1;
  }

  back(): Location | null {
    if (!this.canBack) return null;
    return { ...this.entries[--this.index]! };
  }

  forward(): Location | null {
    if (!this.canForward) return null;
    return { ...this.entries[++this.index]! };
  }

  get canBack(): boolean {
    return this.index > 0;
  }
  get canForward(): boolean {
    return this.index >= 0 && this.index < this.entries.length - 1;
  }
}
