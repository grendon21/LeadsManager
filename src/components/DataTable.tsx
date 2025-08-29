import { useState, useRef, useCallback, useEffect } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable'
import Papa from 'papaparse'
import SortableColumn from './SortableColumn'
import EditableCell from './EditableCell'

interface TableData {
  headers: string[]
  rows: string[][]
}

interface DataTableProps {
  data: TableData
  onDataChange: (data: TableData) => void
  onReset: () => void
}

export default function DataTable({ data, onDataChange, onReset }: DataTableProps) {
  const [columnWidths, setColumnWidths] = useState<number[]>(
    new Array(data.headers.length).fill(150)
  )
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null)
  const [isResizing, setIsResizing] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ columnIndex: number; x: number; y: number } | null>(null)
  
  const tableRef = useRef<HTMLDivElement>(null)
  const resizingRef = useRef<{ columnIndex: number; startX: number; startWidth: number } | null>(null)

  // Reset column widths when new data is loaded
  useEffect(() => {
    setColumnWidths(new Array(data.headers.length).fill(150))
    setSelectedRows(new Set())
    setEditingCell(null)
  }, [data.headers.length])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleMouseDown = useCallback((e: React.MouseEvent, columnIndex: number) => {
    e.preventDefault()
    e.stopPropagation()
    
    setIsResizing(true)
    const startX = e.clientX
    const startWidth = columnWidths[columnIndex]
    
    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault()
      const diff = e.clientX - startX
      const newWidth = Math.max(100, startWidth + diff)
      
      setColumnWidths(prev => {
        const newWidths = [...prev]
        newWidths[columnIndex] = newWidth
        return newWidths
      })
    }

    const handleMouseUp = (e: MouseEvent) => {
      e.preventDefault()
      setIsResizing(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [columnWidths])

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = data.headers.findIndex(header => header === active.id)
      const newIndex = data.headers.findIndex(header => header === over.id)

      const newHeaders = arrayMove(data.headers, oldIndex, newIndex)
      const newRows = data.rows.map(row => arrayMove(row, oldIndex, newIndex))
      const newWidths = arrayMove(columnWidths, oldIndex, newIndex)

      setColumnWidths(newWidths)
      onDataChange({ headers: newHeaders, rows: newRows })
    }
  }

  const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
    const newRows = [...data.rows]
    newRows[rowIndex] = [...newRows[rowIndex]]
    newRows[rowIndex][colIndex] = value
    onDataChange({ headers: data.headers, rows: newRows })
  }

  const handleHeaderChange = (colIndex: number, value: string) => {
    const newHeaders = [...data.headers]
    newHeaders[colIndex] = value
    onDataChange({ headers: newHeaders, rows: data.rows })
  }

  const toggleRowSelection = (rowIndex: number) => {
    setSelectedRows(prev => {
      const newSelected = new Set(prev)
      if (newSelected.has(rowIndex)) {
        newSelected.delete(rowIndex)
      } else {
        newSelected.add(rowIndex)
      }
      return newSelected
    })
  }

  const selectAllRows = () => {
    if (selectedRows.size === data.rows.length) {
      setSelectedRows(new Set())
    } else {
      setSelectedRows(new Set(data.rows.map((_, index) => index)))
    }
  }

  const deleteSelectedRows = () => {
    const newRows = data.rows.filter((_, index) => !selectedRows.has(index))
    onDataChange({ headers: data.headers, rows: newRows })
    setSelectedRows(new Set())
  }

  const addColumn = () => {
    const newColumnName = `Column ${data.headers.length + 1}`
    const newHeaders = [...data.headers, newColumnName]
    const newRows = data.rows.map(row => [...row, ''])
    const newWidths = [...columnWidths, 150]
    
    setColumnWidths(newWidths)
    onDataChange({ headers: newHeaders, rows: newRows })
  }

  const addRow = () => {
    const newRow = new Array(data.headers.length).fill('')
    const newRows = [...data.rows, newRow]
    onDataChange({ headers: data.headers, rows: newRows })
  }

  const handleColumnClick = (e: React.MouseEvent, columnIndex: number) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({
      columnIndex,
      x: e.clientX,
      y: e.clientY
    })
  }

  const insertColumnLeft = (columnIndex: number) => {
    const newHeaders = [...data.headers]
    const newWidths = [...columnWidths]
    
    newHeaders.splice(columnIndex, 0, `Column ${data.headers.length + 1}`)
    newWidths.splice(columnIndex, 0, 150)
    
    const newRows = data.rows.map(row => {
      const newRow = [...row]
      newRow.splice(columnIndex, 0, '')
      return newRow
    })
    
    setColumnWidths(newWidths)
    onDataChange({ headers: newHeaders, rows: newRows })
    setContextMenu(null)
  }

  const insertColumnRight = (columnIndex: number) => {
    const newHeaders = [...data.headers]
    const newWidths = [...columnWidths]
    
    newHeaders.splice(columnIndex + 1, 0, `Column ${data.headers.length + 1}`)
    newWidths.splice(columnIndex + 1, 0, 150)
    
    const newRows = data.rows.map(row => {
      const newRow = [...row]
      newRow.splice(columnIndex + 1, 0, '')
      return newRow
    })
    
    setColumnWidths(newWidths)
    onDataChange({ headers: newHeaders, rows: newRows })
    setContextMenu(null)
  }

  const deleteColumn = (columnIndex: number) => {
    if (data.headers.length <= 1) return // Don't delete if it's the last column
    
    const newHeaders = data.headers.filter((_, index) => index !== columnIndex)
    const newWidths = columnWidths.filter((_, index) => index !== columnIndex)
    const newRows = data.rows.map(row => row.filter((_, index) => index !== columnIndex))
    
    setColumnWidths(newWidths)
    onDataChange({ headers: newHeaders, rows: newRows })
    setContextMenu(null)
  }

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null)
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const exportToCSV = () => {
    const rowsToExport = selectedRows.size > 0 
      ? data.rows.filter((_, index) => selectedRows.has(index))
      : data.rows
    
    const csvContent = Papa.unparse({
      fields: data.headers,
      data: rowsToExport
    })
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    const filename = selectedRows.size > 0 
      ? `leadsmanager-selected-${selectedRows.size}-rows.csv`
      : 'leadsmanager-export.csv'
    
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="bg-white rounded-lg shadow-lg">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Data Table ({data.rows.length} rows)
          </h2>
          {selectedRows.size > 0 && (
            <span className="text-sm text-gray-600">
              {selectedRows.size} selected
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {selectedRows.size > 0 && (
            <button
              onClick={deleteSelectedRows}
              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
            >
              Delete Selected
            </button>
          )}
          <button
            onClick={exportToCSV}
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            {selectedRows.size > 0 ? `Export Selected (${selectedRows.size})` : 'Export All'}
          </button>
          <button
            onClick={onReset}
            className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
          >
            New Upload
          </button>
        </div>
      </div>

      <div ref={tableRef} className="overflow-auto max-h-96">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0 z-30 shadow-lg shadow-gray-200/50">
              <tr>
                <th className="w-20 px-4 py-3 border-r border-gray-200 bg-gray-50 sticky left-0 z-40 shadow-lg shadow-gray-200/50">
                  <div className="flex items-center justify-between">
                    <input
                      type="checkbox"
                      checked={selectedRows.size === data.rows.length && data.rows.length > 0}
                      onChange={selectAllRows}
                      className="rounded border-gray-300"
                    />
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">#</span>
                  </div>
                </th>
                <SortableContext items={data.headers} strategy={horizontalListSortingStrategy}>
                  {data.headers.map((header, index) => (
                    <SortableColumn
                      key={`column-${index}-${header}`}
                      id={header}
                      header={header}
                      width={columnWidths[index]}
                      columnIndex={index}
                      onResize={(e) => handleMouseDown(e, index)}
                      onHeaderChange={(value) => handleHeaderChange(index, value)}
                      onClick={(e) => handleColumnClick(e, index)}
                      isResizing={isResizing}
                    />
                  ))}
                </SortableContext>
                <th 
                  className="px-3 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider border-r border-gray-200 bg-gray-50 cursor-pointer hover:bg-gray-100 hover:text-gray-600 transition-colors whitespace-nowrap"
                  onClick={addColumn}
                  style={{ minWidth: '110px', width: '110px' }}
                >
                  <div className="flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span className="text-xs">Add Column</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className={`border-b border-gray-100 hover:bg-gray-50 ${
                    selectedRows.has(rowIndex) ? 'bg-blue-50' : ''
                  }`}
                >
                  <td className="w-20 px-4 py-2 border-r border-gray-200 bg-gray-50 sticky left-0 z-10 shadow-lg shadow-gray-200/50">
                    <div className="flex items-center justify-between">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(rowIndex)}
                        onChange={() => toggleRowSelection(rowIndex)}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-500 font-medium">
                        {rowIndex + 1}
                      </span>
                    </div>
                  </td>
                  {row.map((cell, colIndex) => (
                    <EditableCell
                      key={`${rowIndex}-${colIndex}`}
                      value={cell}
                      width={columnWidths[colIndex]}
                      isEditing={editingCell?.row === rowIndex && editingCell?.col === colIndex}
                      onEdit={() => setEditingCell({ row: rowIndex, col: colIndex })}
                      onSave={(value) => {
                        handleCellChange(rowIndex, colIndex, value)
                        setEditingCell(null)
                      }}
                      onCancel={() => setEditingCell(null)}
                    />
                  ))}
                  <td className="px-3 py-2 text-sm text-gray-300 border-r border-gray-200 bg-gray-50/50" style={{ minWidth: '110px', width: '110px' }}>
                    {/* Empty cell for Add Column */}
                  </td>
                </tr>
              ))}
              <tr 
                className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer bg-gray-50/30"
                onClick={addRow}
              >
                <td className="w-20 px-4 py-2 border-r border-gray-200 bg-gray-50 sticky left-0 z-10 shadow-lg shadow-gray-200/50">
                  <div className="flex items-center justify-center">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                </td>
                <td 
                  className="px-4 py-2 text-sm text-gray-400 border-r border-gray-200"
                  style={{ width: `${columnWidths[0]}px`, minWidth: `${columnWidths[0]}px` }}
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    New row
                  </div>
                </td>
                {data.headers.slice(1).map((_, colIndex) => (
                  <td 
                    key={colIndex + 1}
                    className="px-4 py-2 text-sm text-gray-300 border-r border-gray-200"
                    style={{ width: `${columnWidths[colIndex + 1]}px`, minWidth: `${columnWidths[colIndex + 1]}px` }}
                  >
                  </td>
                ))}
                <td className="px-3 py-2 text-sm text-gray-300 border-r border-gray-200 bg-gray-50/50" style={{ minWidth: '110px', width: '110px' }}>
                  {/* Empty cell for Add Column */}
                </td>
              </tr>
            </tbody>
          </table>
        </DndContext>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
            minWidth: '200px'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-3 text-sm text-gray-700"
            onClick={() => {
              // Trigger edit mode for the specific column header
              const headerElement = document.querySelector(`th[data-column-index="${contextMenu.columnIndex}"]`)
              if (headerElement) {
                headerElement.dispatchEvent(new Event('dblclick', { bubbles: true }))
              }
              setContextMenu(null)
            }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Rename column
          </button>
          
          <button
            className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-3 text-sm text-gray-700"
            onClick={() => insertColumnLeft(contextMenu.columnIndex)}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Insert 1 column left
          </button>
          
          <button
            className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-3 text-sm text-gray-700"
            onClick={() => insertColumnRight(contextMenu.columnIndex)}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
            Insert 1 column right
          </button>
          
          <hr className="my-2 border-gray-200" />
          
          <button
            className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-3 text-sm text-red-600"
            onClick={() => deleteColumn(contextMenu.columnIndex)}
            disabled={data.headers.length <= 1}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </button>
        </div>
      )}
    </div>
  )
}