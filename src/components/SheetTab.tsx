import { useState } from 'react'

interface Sheet {
  id: string
  name: string
  data: any
}

interface SheetTabProps {
  sheet: Sheet
  isActive: boolean
  onClick: () => void
  onRename: (name: string) => void
  onDelete: () => void
  canDelete: boolean
}

export default function SheetTab({ sheet, isActive, onClick, onRename, onDelete, canDelete }: SheetTabProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [tempName, setTempName] = useState(sheet.name)

  const handleDoubleClick = () => {
    setIsEditing(true)
    setTempName(sheet.name)
  }

  const handleSave = () => {
    const newName = tempName.trim() || sheet.name
    onRename(newName)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setTempName(sheet.name)
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault()
    if (canDelete) {
      const confirmed = window.confirm(`Are you sure you want to delete "${sheet.name}"?`)
      if (confirmed) {
        onDelete()
      }
    }
  }

  return (
    <div
      className={`group relative flex items-center px-3 py-1 text-sm cursor-pointer transition-colors rounded-t border-b-2 ${
        isActive 
          ? 'bg-blue-50 text-blue-700 border-blue-500' 
          : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border-transparent'
      }`}
      onClick={onClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleRightClick}
    >
      {isEditing ? (
        <input
          type="text"
          value={tempName}
          onChange={(e) => setTempName(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="bg-white border border-gray-300 rounded px-2 py-0.5 text-sm min-w-20 max-w-48 focus:outline-none focus:ring-1 focus:ring-blue-500"
          autoFocus
        />
      ) : (
        <span className="max-w-48" title={sheet.name}>
          {sheet.name}
        </span>
      )}
      
      {/* Data indicator */}
      {sheet.data && (
        <div className="w-1.5 h-1.5 bg-green-500 rounded-full ml-2 flex-shrink-0" title="Has data" />
      )}
      
      {/* Delete button (only shows on hover and if deletable) */}
      {canDelete && !isEditing && (
        <button
          className="ml-1 opacity-0 group-hover:opacity-100 hover:bg-red-100 hover:text-red-600 rounded p-0.5 transition-all"
          onClick={(e) => {
            e.stopPropagation()
            const confirmed = window.confirm(`Are you sure you want to delete "${sheet.name}"?`)
            if (confirmed) {
              onDelete()
            }
          }}
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}