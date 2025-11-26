import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { PencilSimple, Check, X } from '@phosphor-icons/react'
import type { TankData } from '@/lib/structuredPdfProcessor'

interface TankTableProps {
  tanks: TankData[]
  onUpdate: (tanks: TankData[]) => void
}

export function TankTable({ tanks, onUpdate }: TankTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Partial<TankData>>({})

  const startEdit = (tank: TankData) => {
    setEditingId(tank.id)
    setEditValues({
      easting: tank.easting,
      northing: tank.northing,
      name: tank.name
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditValues({})
  }

  const saveEdit = (tank: TankData) => {
    const updated = tanks.map(t => 
      t.id === tank.id 
        ? { ...t, ...editValues }
        : t
    )
    onUpdate(updated)
    setEditingId(null)
    setEditValues({})
  }

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Coordenadas Estanques</h3>
          <p className="text-sm text-muted-foreground">
            {tanks.length} estanques extraídos (UTM 18S)
          </p>
        </div>
      </div>

      <div className="border rounded-md overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">ID</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Este (UTM)</TableHead>
              <TableHead>Norte (UTM)</TableHead>
              <TableHead>Latitud</TableHead>
              <TableHead>Longitud</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tanks.map((tank) => (
              <TableRow key={tank.id}>
                <TableCell className="font-mono text-xs">{tank.id}</TableCell>
                <TableCell>
                  {editingId === tank.id ? (
                    <Input
                      value={editValues.name || ''}
                      onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
                      className="h-8 text-sm"
                    />
                  ) : (
                    <span className="text-sm">{tank.name}</span>
                  )}
                </TableCell>
                <TableCell>
                  {editingId === tank.id ? (
                    <Input
                      type="number"
                      value={editValues.easting || ''}
                      onChange={(e) => setEditValues({ ...editValues, easting: parseFloat(e.target.value) })}
                      className="h-8 font-mono text-sm"
                    />
                  ) : (
                    <span className="font-mono text-sm">{tank.easting.toFixed(2)}</span>
                  )}
                </TableCell>
                <TableCell>
                  {editingId === tank.id ? (
                    <Input
                      type="number"
                      value={editValues.northing || ''}
                      onChange={(e) => setEditValues({ ...editValues, northing: parseFloat(e.target.value) })}
                      className="h-8 font-mono text-sm"
                    />
                  ) : (
                    <span className="font-mono text-sm">{tank.northing.toFixed(2)}</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="font-mono text-xs text-muted-foreground">
                    {tank.latitude.toFixed(6)}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-xs text-muted-foreground">
                    {tank.longitude.toFixed(6)}
                  </span>
                </TableCell>
                <TableCell>
                  {editingId === tank.id ? (
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => saveEdit(tank)}>
                        <Check size={16} />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={cancelEdit}>
                        <X size={16} />
                      </Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => startEdit(tank)}>
                      <PencilSimple size={16} />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {tanks.length > 0 && (
        <div className="mt-4 flex items-center gap-2">
          <Badge variant="secondary">
            UTM Zona 18S
          </Badge>
          <Badge variant="outline">
            WGS84 convertido
          </Badge>
        </div>
      )}
    </Card>
  )
}
