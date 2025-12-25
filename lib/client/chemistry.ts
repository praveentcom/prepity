type ResolveFn = (url: string) => void;
type RejectFn = (error: Error) => void;

interface PendingRequest {
  resolve: ResolveFn;
  reject: RejectFn;
}

class ChemistryBatcher {
  private static instance: ChemistryBatcher;
  private queue: Map<string, PendingRequest[]> = new Map();
  private inFlight: Map<string, Promise<string>> = new Map();
  private timeout: NodeJS.Timeout | null = null;
  private readonly BATCH_WINDOW_MS = 50;
  private readonly MAX_BATCH_SIZE = 15;

  private constructor() {}

  public static getInstance(): ChemistryBatcher {
    if (!ChemistryBatcher.instance) {
      ChemistryBatcher.instance = new ChemistryBatcher();
    }
    return ChemistryBatcher.instance;
  }

  public async fetch(content: string): Promise<string> {
    if (this.inFlight.has(content)) {
      return this.inFlight.get(content)!;
    }

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
    this.timeout = null;
    
    const allContents = Array.from(this.queue.keys());
    const contentsToProcess = allContents.slice(0, this.MAX_BATCH_SIZE);
    
    if (contentsToProcess.length === 0) return;

    const batchRequests: Map<string, PendingRequest[]> = new Map();
    contentsToProcess.forEach(content => {
      batchRequests.set(content, this.queue.get(content)!);
      this.queue.delete(content);
    });

    if (this.queue.size > 0) {
      this.timeout = setTimeout(() => this.processQueue(), 10);
    }

    const batchPromise = (async () => {
      try {
        const response = await fetch('/api/render-chemistry', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ contents: contentsToProcess }),
        });

        if (!response.ok) {
          throw new Error(`API responded with ${response.status}`);
        }

        const { results } = await response.json();
        return results;
      } catch (error: any) {
        throw error;
      }
    })();

    contentsToProcess.forEach(content => {
      this.inFlight.set(content, batchPromise.then(results => {
        const result = results[content];
        if (result?.url) return result.url;
        throw new Error(result?.error || 'Rendering failed');
      }).finally(() => {
        this.inFlight.delete(content);
      }));
    });

    contentsToProcess.forEach(content => {
      const requests = batchRequests.get(content)!;
      const promise = this.inFlight.get(content)!;
      promise.then(url => {
        requests.forEach(r => r.resolve(url));
      }).catch(err => {
        requests.forEach(r => r.reject(err));
      });
    });
  }
}

export const chemistryBatcher = ChemistryBatcher.getInstance();
