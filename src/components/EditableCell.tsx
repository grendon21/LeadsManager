import { useState, useEffect, useRef } from 'react'

interface EditableCellProps {
  value: string
  width: number
  isEditing: boolean
  onEdit: () => void
  onSave: (value: string) => void
  onCancel: () => void
}

export default function EditableCell({
  value,
  width,
  isEditing,
  onEdit,
  onSave,
  onCancel,
}: EditableCellProps) {
  const [tempValue, setTempValue] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTempValue(value)
  }, [value])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleSave = () => {
    onSave(tempValue)
  }

  const handleCancel = () => {
    setTempValue(value)
    onCancel()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  const style = {
    width: `${width}px`,
    minWidth: `${width}px`,
  }

  return (
    <td
      style={style}
      className="px-4 py-2 text-sm text-gray-900 border-r border-gray-200"
      onDoubleClick={onEdit}
    >
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={tempValue}
          onChange={(e) => setTempValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="w-full bg-white border border-blue-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      ) : (
        <div className="truncate cursor-pointer hover:bg-gray-100 rounded px-1 py-1" title={value}>
          {value || '\u00A0'}
        </div>
      )}
    </td>
  )
}