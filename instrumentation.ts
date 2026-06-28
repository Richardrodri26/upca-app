export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { syncWithRag } = await import("./src/lib/rag-sync");
    syncWithRag().catch((e) => {
      console.error("[RAG Sync] Error en startup:", e);
    });
  }
}
