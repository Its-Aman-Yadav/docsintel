"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface FileUploadPanelProps {
  files: File[]
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onUpload: () => void
  uploading: boolean
  error: string
}

export function FileUploadPanel({ files, onFileChange, onUpload, uploading, error }: FileUploadPanelProps) {
  return (
    <div className="w-1/5 border-r p-4 flex flex-col items-start justify-start space-y-4 bg-gray-50">
      <Input type="file" accept=".pdf,.doc,.docx,.txt" multiple onChange={onFileChange} />
      {files.length > 0 && (
        <ul className="text-xs text-gray-600 space-y-1">
          {files.map((file, idx) => (
            <li key={idx}>• {file.name}</li>
          ))}
        </ul>
      )}
      <Button onClick={onUpload} disabled={uploading} className="w-full">
        {uploading ? "Uploading..." : "Upload Documents"}
      </Button>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  )
}
