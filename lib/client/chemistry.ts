type ResolveFn = (url: string) => void;
type RejectFn = (error: Error) => void;

interface PendingRequest {
  resolve: ResolveFn;
  reject: RejectFn;
}

class ChemistryBatcher {
  private static instance: ChemistryBatcher;
  private queue: Map<string, PendingRequest[]> = new Map();
  private timeout: NodeJS.Timeout | null = null;
  private readonly BATCH_WINDOW_MS = 50;

  private constructor() {}

  public static getInstance(): ChemistryBatcher {
    if (!ChemistryBatcher.instance) {
      ChemistryBatcher.instance = new ChemistryBatcher();
    }
    return ChemistryBatcher.instance;
  }

  public async fetch(content: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.queue.has(content)) {
        this.queue.set(content, []);
      }
      this.queue.get(content)!.push({ resolve, reject });

      if (!this.timeout) {
        this.timeout = setTimeout(() => this.processQueue(), this.BATCH_WINDOW_MS);
      }
    });
  }

  private async processQueue() {
    const currentQueue = new Map(this.queue);
    this.queue.clear();
    this.timeout = null;

    const contents = Array.from(currentQueue.keys());
    if (contents.length === 0) return;

    try {
      const response = await fetch('/api/render-chemistry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contents }),
      });

      if (!response.ok) {
        throw new Error(`API responded with ${response.status}`);
      }

      const { results } = await response.json();

      currentQueue.forEach((requests, content) => {
        const result = results[content];
        if (result?.url) {
          requests.forEach(r => r.resolve(result.url));
        } else {
          const error = new Error(result?.error || 'Rendering failed');
          requests.forEach(r => r.reject(error));
        }
      });
    } catch (error: any) {
      currentQueue.forEach(requests => {
        requests.forEach(r => r.reject(error));
      });
    }
  }
}

export const chemistryBatcher = ChemistryBatcher.getInstance();
