import { useState, useEffect } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface SortableColumnProps {
  id: string
  header: string
  width: number
  columnIndex: number
  onResize: (e: React.MouseEvent) => void
  onHeaderChange: (value: string) => void
  onClick?: (e: React.MouseEvent) => void
  onStartRename?: (renameFunc: () => void) => void
  isResizing?: boolean
  sortConfig?: { columnIndex: number; direction: 'asc' | 'desc' } | null
}

export default function SortableColumn({ 
  id, 
  header, 
  width, 
  columnIndex,
  onResize, 
  onHeaderChange,
  onClick,
  onStartRename,
  isResizing = false,
  sortConfig = null
}: SortableColumnProps) {
  const [isEditingHeader, setIsEditingHeader] = useState(false)
  const [tempHeader, setTempHeader] = useState(header)
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id,
    disabled: isResizing
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    width: `${width}px`,
    minWidth: `${width}px`,
  }

  const handleStartRename = () => {
    setIsEditingHeader(true)
    setTempHeader(header)
  }

  // Register the rename function with parent
  useEffect(() => {
    if (onStartRename) {
      onStartRename(handleStartRename)
    }
  }, [onStartRename])


  const handleHeaderSave = () => {
    onHeaderChange(tempHeader.trim() || header)
    setIsEditingHeader(false)
  }

  const handleHeaderCancel = () => {
    setTempHeader(header)
    setIsEditingHeader(false)
  }

  const handleHeaderKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleHeaderSave()
    } else if (e.key === 'Escape') {
      handleHeaderCancel()
    }
  }


  return (
    <th
      ref={setNodeRef}
      style={style}
      className={`relative px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 bg-gray-50 ${
        isDragging ? 'opacity-50' : ''
      }`}
      data-column-index={columnIndex}
      {...attributes}
    >
      <div className="flex items-center justify-between h-full">
        <div className="flex-1 flex items-center">
          {/* Click area for menu */}
          <div
            className="cursor-pointer hover:bg-gray-200 rounded px-1 py-1 flex-1"
            onClick={onClick}
          >
            {isEditingHeader ? (
              <input
                type="text"
                value={tempHeader}
                onChange={(e) => setTempHeader(e.target.value)}
                onBlur={handleHeaderSave}
                onKeyDown={handleHeaderKeyDown}
                className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm"
                autoFocus
              />
            ) : (
              <div className="flex items-center gap-2 w-full">
                <span className="truncate block" title={header}>
                  {header}
                </span>
                {sortConfig && (
                  <div className="flex-shrink-0">
                    {sortConfig.direction === 'asc' ? (
                      <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    ) : (
                      <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          {/* Separate drag handle */}
          <div
            className="cursor-move px-1 py-1 hover:bg-gray-300 rounded ml-1"
            {...listeners}
          >
            <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
            </svg>
          </div>
        </div>
        
        <div
          className="w-2 h-full cursor-col-resize hover:bg-blue-500 absolute right-0 top-0 bg-transparent hover:bg-opacity-50"
          style={{ marginRight: '-4px' }}
          onMouseDown={(e) => {
            e.stopPropagation()
            e.preventDefault()
            onResize(e)
          }}
        />
      </div>
    </th>
  )
}