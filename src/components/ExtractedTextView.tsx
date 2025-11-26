import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useState } from 'react'
import { PencilSimple, Check, X } from '@phosphor-icons/react'
import type { CoordinateMatch } from '@/lib/pdfProcessor'

interface ExtractedTextViewProps {
  text: string
  coordinates: CoordinateMatch[]
  onTextUpdate: (newText: string) => void
}

export function ExtractedTextView({ text, coordinates, onTextUpdate }: ExtractedTextViewProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedText, setEditedText] = useState(text)

  const handleSave = () => {
    onTextUpdate(editedText)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditedText(text)
    setIsEditing(false)
  }

  const highlightCoordinates = (text: string): React.ReactElement[] => {
    if (coordinates.length === 0) {
      return [<span key="0">{text}</span>]
    }

    const parts: React.ReactElement[] = []
    let lastIndex = 0

    coordinates.forEach((coord, idx) => {
      const index = text.indexOf(coord.raw, lastIndex)
      if (index !== -1) {
        if (index > lastIndex) {
          parts.push(<span key={`text-${idx}`}>{text.slice(lastIndex, index)}</span>)
        }
        parts.push(
          <Badge key={`coord-${idx}`} variant="secondary" className="mx-1 bg-accent text-accent-foreground">
            {coord.raw}
          </Badge>
        )
        lastIndex = index + coord.raw.length
      }
    })

    if (lastIndex < text.length) {
      parts.push(<span key="end">{text.slice(lastIndex)}</span>)
    }

    return parts
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Extracted Text</h3>
        {!isEditing ? (
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
            <PencilSimple className="mr-2" />
            Edit
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCancel}>
              <X className="mr-2" />
              Cancel
            </Button>
            <Button variant="default" size="sm" onClick={handleSave}>
              <Check className="mr-2" />
              Save
            </Button>
          </div>
        )}
      </div>

      <Separator className="mb-4" />

      {isEditing ? (
        <Textarea
          value={editedText}
          onChange={(e) => setEditedText(e.target.value)}
          className="min-h-[200px] font-mono text-sm"
          placeholder="Extracted text will appear here..."
        />
      ) : (
        <div className="text-sm leading-relaxed text-foreground whitespace-pre-wrap break-words">
          {highlightCoordinates(text)}
        </div>
      )}

      {coordinates.length > 0 && !isEditing && (
        <div className="mt-4 pt-4 border-t">
          <p className="text-sm font-medium text-muted-foreground mb-2">
            Found {coordinates.length} coordinate{coordinates.length !== 1 ? 's' : ''}
          </p>
          <div className="flex flex-wrap gap-2">
            {coordinates.map((coord, idx) => (
              <Badge key={idx} variant="outline" className="font-mono text-xs">
                {coord.lat?.toFixed(6)}, {coord.lon?.toFixed(6)}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}
