import { useState, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { UploadSimple, FileText } from '@phosphor-icons/react'

interface FileUploadProps {
  onFileSelect: (file: File) => void
  isProcessing: boolean
}

export function FileUpload({ onFileSelect, isProcessing }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const validateFile = (file: File): boolean => {
    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file')
      return false
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB')
      return false
    }
    setError(null)
    return true
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      const file = files[0]
      if (validateFile(file)) {
        onFileSelect(file)
      }
    }
  }, [onFileSelect])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      const file = files[0]
      if (validateFile(file)) {
        onFileSelect(file)
      }
    }
  }, [onFileSelect])

  return (
    <div className="space-y-4">
      <Card
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative p-12 transition-all duration-200 cursor-pointer
          ${isDragging 
            ? 'border-primary border-2 bg-primary/5' 
            : 'border-dashed border-2 border-border hover:border-primary/50'
          }
          ${isProcessing ? 'opacity-50 pointer-events-none' : ''}
        `}
      >
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileInput}
          disabled={isProcessing}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          id="file-upload"
        />
        <div className="flex flex-col items-center gap-4 text-center">
          {isProcessing ? (
            <>
              <FileText size={48} className="text-primary animate-pulse" />
              <div>
                <p className="text-lg font-medium text-foreground">Processing PDF...</p>
                <p className="text-sm text-muted-foreground mt-1">Extracting text and coordinates</p>
              </div>
            </>
          ) : (
            <>
              <UploadSimple size={48} className="text-muted-foreground" />
              <div>
                <p className="text-lg font-medium text-foreground">Drop your PDF here</p>
                <p className="text-sm text-muted-foreground mt-1">or click to browse</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById('file-upload')?.click()}>
                Select File
              </Button>
            </>
          )}
        </div>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
