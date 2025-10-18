interface DocumentPreviewProps {
  highlightedContent: string
}

export function DocumentPreview({ highlightedContent }: DocumentPreviewProps) {
  return (
    <div className="w-2/5 border-r p-4 overflow-y-auto">
      <h2 className="text-lg font-semibold mb-2 text-center">Document Preview</h2>
      <div
        className="prose dark:prose-invert max-h-full"
        dangerouslySetInnerHTML={{
          __html: highlightedContent.replace(/\n/g, "<br/>"),
        }}
      />
    </div>
  )
}
