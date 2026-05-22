import { createSignal, For, Show } from "solid-js";
import { useGlobalSDK } from "~/lib/sdk";
import { manualModeStore } from "~/store/manual-mode";

export function ManualPanel() {
  const globalSdk = useGlobalSDK();
  const [loading, setLoading] = createSignal(false);
  const [responseText, setResponseText] = createSignal<Record<string, string>>({});

  const pendingRequests = () => manualModeStore.pendingRequests;

  const handleSubmit = async (requestId: string) => {
    const response = responseText()[requestId] || "";
    if (!response.trim()) return;

    setLoading(true);
    try {
      await globalSdk.client.manual.submit({
        request_id: requestId,
        response: response,
      });
      setResponseText((prev) => {
        const next = { ...prev };
        delete next[requestId];
        return next;
      });
    } catch (error) {
      console.error("Failed to submit response:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyRequest = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div class="manual-panel border-t border-border bg-muted/30 p-4">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-sm font-semibold">Manual Mode - Pending Requests</h3>
        <Show when={pendingRequests().length > 0}>
          <span class="text-xs text-muted-foreground">
            {pendingRequests().length} pending
          </span>
        </Show>
      </div>

      <Show
        when={pendingRequests().length > 0}
        fallback={
          <div class="text-sm text-muted-foreground text-center py-8">
            No pending requests. Send a message to create a request.
          </div>
        }
      >
        <div class="space-y-4">
          <For each={pendingRequests()}>
            {(request) => (
              <div class="border border-border rounded-lg p-4 bg-card">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-xs text-muted-foreground font-mono">
                    {request.id.slice(0, 8)}...
                  </span>
                  <span class="text-xs text-muted-foreground">
                    {new Date(request.created_at).toLocaleTimeString()}
                  </span>
                </div>

                <div class="mb-3">
                  <div class="text-sm font-medium mb-1">Request:</div>
                  <div class="text-sm text-muted-foreground bg-muted p-3 rounded-md font-mono whitespace-pre-wrap">
                    {request.prompt}
                  </div>
                  <button
                    onClick={() => handleCopyRequest(request.prompt)}
                    class="text-xs text-primary hover:underline mt-1"
                  >
                    Copy to clipboard
                  </button>
                </div>

                <div class="mb-3">
                  <div class="text-sm font-medium mb-1">Your Response:</div>
                  <textarea
                    value={responseText()[request.id] || ""}
                    onInput={(e) =>
                      setResponseText((prev) => ({
                        ...prev,
                        [request.id]: e.currentTarget.value,
                      }))
                    }
                    placeholder="Paste your AI response here..."
                    class="w-full min-h-[100px] p-3 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <button
                  onClick={() => handleSubmit(request.id)}
                  disabled={loading() || !(responseText()[request.id] || "").trim()}
                  class="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading() ? "Submitting..." : "Submit Response"}
                </button>
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
