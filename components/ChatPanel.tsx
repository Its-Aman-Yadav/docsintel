import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface ChatPanelProps {
  uploaded: boolean
  query: string
  answer: string
  sources: any[]
  loadingAnswer: boolean
  onQueryChange: (value: string) => void
  onAsk: () => void
}

export function ChatPanel({
  uploaded,
  query,
  answer,
  sources,
  loadingAnswer,
  onQueryChange,
  onAsk,
}: ChatPanelProps) {
  return (
    <div className="w-2/5 p-4 overflow-y-auto">
      <h2 className="text-lg font-semibold mb-2 text-center">Chat</h2>

      {uploaded ? (
        <>
          <div className="flex gap-2 mb-4">
            <Input
              type="text"
              placeholder="Ask something about your documents..."
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
            />
            <Button onClick={onAsk} disabled={loadingAnswer || !query.trim()}>
              {loadingAnswer ? "Thinking..." : "Ask"}
            </Button>
          </div>

          {answer && (
            <div className="p-4 border rounded-md bg-gray-50 mb-4">
              <p className="font-semibold mb-1">Answer:</p>
              <p>{answer}</p>
            </div>
          )}

          {sources.length > 0 && (
            <div className="p-4 border rounded-md bg-gray-50">
              <p className="font-semibold mb-2">Sources:</p>
              <ul className="list-disc pl-5 space-y-1">
                {sources.slice(0, 3).map((s, i) => (
                  <li key={i}>
                    <span className="text-gray-700">{s.text?.slice(0, 100)}...</span>{" "}
                    <span className="text-sm text-gray-500">(from {s.fileName})</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      ) : (
        <div className="text-center text-gray-500 italic mt-10">
          Upload documents to start chatting with them.
        </div>
      )}
    </div>
  )
}
