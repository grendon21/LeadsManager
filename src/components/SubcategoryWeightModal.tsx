import { useState, useEffect, useMemo } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface TableData {
  headers: string[]
  rows: string[][]
}

const IMPORTANCE_LEVELS = {
  'Very Important': 100,
  'Important': 75,
  'Normal': 50,
  'A Little Important': 25,
  'Not Important': 0
}

interface SubcategoryWeightModalProps {
  isOpen: boolean
  onClose: () => void
  data: TableData
  columnName: string
  onSave: (columnName: string, weights: { [key: string]: number }) => void
}

export default function SubcategoryWeightModal({ 
  isOpen, 
  onClose, 
  data, 
  columnName,
  onSave 
}: SubcategoryWeightModalProps) {
  const [weights, setWeights] = useState<{ [key: string]: number }>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [bulkImportance, setBulkImportance] = useState<keyof typeof IMPORTANCE_LEVELS>('Normal')
  const [customValues, setCustomValues] = useState<string[]>([])
  const [newCustomValue, setNewCustomValue] = useState('')
  const [newCustomWeight, setNewCustomWeight] = useState(50)
  const [showAddCustom, setShowAddCustom] = useState(false)
  const [activeTab, setActiveTab] = useState<'list' | 'drag'>('list')
  const [draggedItem, setDraggedItem] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Get unique values for the column (including custom values)
  const uniqueValues = useMemo(() => {
    const columnIndex = data.headers.indexOf(columnName)
    let values: string[] = []
    
    if (columnIndex !== -1) {
      values = data.rows
        .map(row => row[columnIndex])
        .filter(val => val && val.trim())
    }
    
    // Combine existing values with custom values
    const allValues = [...new Set([...values, ...customValues])].sort()
    return allValues
  }, [data, columnName, customValues])

  // Initialize all values to 50 (Normal) when modal opens
  useEffect(() => {
    if (isOpen && uniqueValues.length > 0) {
      const initialWeights: { [key: string]: number } = {}
      uniqueValues.forEach(value => {
        initialWeights[value] = 50 // Default to Normal
      })
      setWeights(initialWeights)
    }
  }, [isOpen, uniqueValues])

  // Filter values based on search
  const filteredValues = useMemo(() => {
    return uniqueValues.filter(value => 
      value.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [uniqueValues, searchTerm])

  // Get distribution summary
  const distribution = useMemo(() => {
    const counts = Object.entries(IMPORTANCE_LEVELS).map(([level, points]) => ({
      level,
      points,
      count: Object.values(weights).filter(weight => weight === points).length
    }))
    return counts
  }, [weights])

  const handleImportanceChange = (value: string, importance: keyof typeof IMPORTANCE_LEVELS) => {
    setWeights(prev => ({
      ...prev,
      [value]: IMPORTANCE_LEVELS[importance]
    }))
  }

  const handleBulkApply = () => {
    const newWeights = { ...weights }
    filteredValues.forEach(value => {
      newWeights[value] = IMPORTANCE_LEVELS[bulkImportance]
    })
    setWeights(newWeights)
  }

  const getImportanceLevelByPoints = (points: number): keyof typeof IMPORTANCE_LEVELS => {
    return Object.entries(IMPORTANCE_LEVELS).find(([_, p]) => p === points)?.[0] as keyof typeof IMPORTANCE_LEVELS || 'Normal'
  }

  const addCustomValue = () => {
    if (newCustomValue.trim() && !uniqueValues.includes(newCustomValue.trim())) {
      const customValue = newCustomValue.trim()
      setCustomValues(prev => [...prev, customValue])
      setWeights(prev => ({
        ...prev,
        [customValue]: newCustomWeight
      }))
      setNewCustomValue('')
      setNewCustomWeight(50)
      setShowAddCustom(false)
    }
  }

  const removeCustomValue = (value: string) => {
    setCustomValues(prev => prev.filter(v => v !== value))
    setWeights(prev => {
      const newWeights = { ...prev }
      delete newWeights[value]
      return newWeights
    })
  }

  const isCustomValue = (value: string) => {
    return customValues.includes(value)
  }

  const handleDragStart = (event: DragStartEvent) => {
    setDraggedItem(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    
    if (over && over.id !== active.id) {
      const draggedValue = active.id as string
      const targetImportance = over.id as keyof typeof IMPORTANCE_LEVELS
      
      if (IMPORTANCE_LEVELS[targetImportance] !== undefined) {
        setWeights(prev => ({
          ...prev,
          [draggedValue]: IMPORTANCE_LEVELS[targetImportance]
        }))
      }
    }
    
    setDraggedItem(null)
  }

  // Organize values by importance level for drag view
  const valuesByImportance = useMemo(() => {
    const organized: { [key: string]: string[] } = {}
    
    Object.keys(IMPORTANCE_LEVELS).forEach(level => {
      organized[level] = []
    })
    
    uniqueValues.forEach(value => {
      const weight = weights[value] || 50
      const level = getImportanceLevelByPoints(weight)
      organized[level].push(value)
    })
    
    return organized
  }, [uniqueValues, weights])

  const handleSave = () => {
    onSave(columnName, weights)
    onClose()
  }

  // Draggable Value Component
  const DraggableValue = ({ value }: { value: string }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: value })

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    }

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`flex items-center justify-between p-2 bg-white border border-gray-200 rounded cursor-move hover:shadow-md transition-shadow ${
          isDragging ? 'opacity-50' : ''
        }`}
        {...attributes}
        {...listeners}
      >
        <span className="text-sm text-gray-900 truncate">{value}</span>
        {isCustomValue(value) && (
          <span className="text-xs bg-green-100 text-green-700 px-1 py-0.5 rounded-full ml-2">
            Custom
          </span>
        )}
      </div>
    )
  }

  // Droppable Importance Bucket Component
  const ImportanceBucket = ({ 
    importance, 
    points, 
    values 
  }: { 
    importance: string
    points: number
    values: string[] 
  }) => {
    const { setNodeRef, isOver } = useSortable({ id: importance })

    const colors = {
      'Very Important': 'bg-green-50 border-green-200',
      'Important': 'bg-blue-50 border-blue-200',
      'Normal': 'bg-gray-50 border-gray-200',
      'A Little Important': 'bg-orange-50 border-orange-200',
      'Not Important': 'bg-red-50 border-red-200'
    }

    return (
      <div
        ref={setNodeRef}
        className={`p-4 border-2 border-dashed rounded-lg min-h-32 transition-colors ${
          colors[importance as keyof typeof colors] || 'bg-gray-50 border-gray-200'
        } ${isOver ? 'border-solid shadow-lg' : ''}`}
      >
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-gray-900">{importance}</h4>
          <span className="text-sm text-gray-500">({points} points)</span>
        </div>
        
        <div className="space-y-2">
          {values.map(value => (
            <DraggableValue key={value} value={value} />
          ))}
          
          {values.length === 0 && (
            <div className="text-center py-4 text-gray-400 text-sm">
              Drop values here
            </div>
          )}
        </div>
        
        <div className="mt-2 text-xs text-gray-500">
          {values.length} {values.length === 1 ? 'value' : 'values'}
        </div>
      </div>
    )
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-gray-900">
                Configure Values: {columnName}
              </h2>
              <span className="text-sm text-gray-500">
                ({uniqueValues.length} unique values)
              </span>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Tab Navigation */}
          <div className="flex border-t border-gray-200">
            <button
              onClick={() => setActiveTab('list')}
              className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'list'
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              List View
            </button>
            <button
              onClick={() => setActiveTab('drag')}
              className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'drag'
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              Drag & Drop View
            </button>
          </div>
        </div>

        {/* Controls & Summary */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <select
                  value={bulkImportance}
                  onChange={(e) => setBulkImportance(e.target.value as keyof typeof IMPORTANCE_LEVELS)}
                  className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
                >
                  {Object.keys(IMPORTANCE_LEVELS).map(level => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
                <button
                  onClick={handleBulkApply}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                >
                  Apply to {searchTerm ? 'Filtered' : 'All'}
                </button>
                <button
                  onClick={() => setShowAddCustom(true)}
                  className="px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium"
                >
                  Add Custom Value
                </button>
              </div>
              
              <div className="relative">
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search values..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-1.5 border border-gray-300 rounded-md text-sm w-64 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            
            {/* Distribution Summary */}
            <div className="flex items-center gap-4 text-xs text-gray-600">
              {distribution.map(({ level, count }) => (
                <div key={level} className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${
                    level === 'Very Important' ? 'bg-green-500' :
                    level === 'Important' ? 'bg-blue-500' :
                    level === 'Normal' ? 'bg-gray-400' :
                    level === 'A Little Important' ? 'bg-orange-500' :
                    'bg-red-500'
                  }`} />
                  <span>{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Add Custom Value Form */}
          {showAddCustom && (
            <div className="mt-3 p-3 border border-gray-200 rounded-lg bg-white">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Enter custom value..."
                  value={newCustomValue}
                  onChange={(e) => setNewCustomValue(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  onKeyPress={(e) => e.key === 'Enter' && addCustomValue()}
                />
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="Weight"
                  value={newCustomWeight}
                  onChange={(e) => setNewCustomWeight(parseInt(e.target.value) || 0)}
                  className="w-20 px-3 py-2 border border-gray-300 rounded-md text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  onClick={addCustomValue}
                  className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium"
                >
                  Add
                </button>
                <button
                  onClick={() => setShowAddCustom(false)}
                  className="px-3 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'list' ? (
            // List View
            <div className="p-4">
              <div className="space-y-2">
                {filteredValues.map((value) => (
                  <div key={value} className="flex items-center justify-between py-2 px-3 border border-gray-200 rounded hover:bg-gray-50">
                    <div className="flex-1 mr-4 flex items-center gap-2">
                      <span className="text-sm text-gray-900 truncate block">{value}</span>
                      {isCustomValue(value) && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                          Custom
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {isCustomValue(value) ? (
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={weights[value] || 50}
                          onChange={(e) => {
                            const newWeight = parseInt(e.target.value) || 0
                            setWeights(prev => ({ ...prev, [value]: newWeight }))
                          }}
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-right text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        <select
                          value={getImportanceLevelByPoints(weights[value] || 50)}
                          onChange={(e) => handleImportanceChange(value, e.target.value as keyof typeof IMPORTANCE_LEVELS)}
                          className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          {Object.entries(IMPORTANCE_LEVELS).map(([level, points]) => (
                            <option key={level} value={level}>
                              {level} ({points})
                            </option>
                          ))}
                        </select>
                      )}
                      {isCustomValue(value) && (
                        <button
                          onClick={() => removeCustomValue(value)}
                          className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                          title="Remove custom value"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {filteredValues.length === 0 && searchTerm && (
                <div className="text-center py-8 text-gray-500">
                  No values found matching "{searchTerm}"
                </div>
              )}
            </div>
          ) : (
            // Drag & Drop View
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(IMPORTANCE_LEVELS).map(([importance, points]) => (
                    <SortableContext key={importance} items={valuesByImportance[importance]} strategy={verticalListSortingStrategy}>
                      <ImportanceBucket
                        importance={importance}
                        points={points}
                        values={valuesByImportance[importance]}
                      />
                    </SortableContext>
                  ))}
                </div>
              </div>
              
              <DragOverlay>
                {draggedItem ? <DraggableValue value={draggedItem} /> : null}
              </DragOverlay>
            </DndContext>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-500">
            {filteredValues.length} values shown
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
            >
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}