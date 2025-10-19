"use client"

import React, { useCallback, useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Upload, FileText, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface FileUploadPanelProps {
  files: File[]
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onUpload: () => void
  uploading: boolean
  error: string
}

export function FileUploadPanel({
  files,
  onFileChange,
  onUpload,
  uploading,
  error,
}: FileUploadPanelProps) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragging(false)
      const droppedFiles = Array.from(e.dataTransfer.files || [])
      const event = {
        target: {
          files: droppedFiles,
        },
      } as unknown as React.ChangeEvent<HTMLInputElement>
      onFileChange(event)
    },
    [onFileChange]
  )

  const triggerFileSelect = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="w-1/3 p-6 bg-white dark:bg-gray-900 border-r h-full flex flex-col justify-between">
      <div>
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4 text-center">
          Upload Files
        </h2>

        <div
          className={cn(
            "w-full h-40 border-2 border-dashed rounded-2xl flex items-center justify-center text-center transition-all duration-300",
            isDragging
              ? "border-blue-500 bg-blue-50 dark:bg-blue-900"
              : "border-gray-300 hover:border-blue-500 bg-gray-50 dark:bg-gray-800"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={triggerFileSelect}
        >
          <div className="flex flex-col items-center justify-center cursor-pointer text-sm text-gray-600 dark:text-gray-300 px-4">
            <Upload className="w-6 h-6 mb-2" />
            <p className="font-medium">Drag and drop files here</p>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              or click to select
            </span>
            <Input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              multiple
              className="hidden"
              onChange={onFileChange}
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="text-red-500 text-sm mt-2 text-center">{error}</p>
        )}

        {/* Files List */}
        {files.length > 0 && (
          <div className="mt-4 space-y-2 text-sm">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-lg shadow-sm"
              >
                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
                  <FileText className="w-4 h-4" />
                  <span className="truncate max-w-[180px]">{file.name}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Button */}
      <div className="mt-6">
        <Button
          onClick={onUpload}
          disabled={uploading || files.length === 0}
          className="w-full rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm py-3"
        >
          {uploading ? "Uploading..." : "Upload & Process"}
        </Button>
      </div>
    </div>
  )
}
