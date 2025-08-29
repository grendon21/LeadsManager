import { useState, useEffect, useMemo } from 'react'

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

interface SimpleSubcategoryModalProps {
  isOpen: boolean
  onClose: () => void
  data: TableData
  columnName: string
  onSave: (columnName: string, weights: { [key: string]: number }) => void
}

export default function SimpleSubcategoryModal({ 
  isOpen, 
  onClose, 
  data, 
  columnName,
  onSave 
}: SimpleSubcategoryModalProps) {
  const [weights, setWeights] = useState<{ [key: string]: number }>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedValue, setSelectedValue] = useState('')
  const [selectedImportance, setSelectedImportance] = useState<keyof typeof IMPORTANCE_LEVELS>('Normal')

  // Get unique values for the column
  const uniqueValues = useMemo(() => {
    const columnIndex = data.headers.indexOf(columnName)
    if (columnIndex === -1) return []
    
    const values = data.rows
      .map(row => row[columnIndex])
      .filter(val => val && val.trim())
    
    return [...new Set(values)].sort()
  }, [data, columnName])

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

  const handleAssign = () => {
    if (selectedValue) {
      setWeights(prev => ({
        ...prev,
        [selectedValue]: IMPORTANCE_LEVELS[selectedImportance]
      }))
      setSelectedValue('')
      setSearchTerm('')
    }
  }

  const getImportanceLevelByPoints = (points: number): keyof typeof IMPORTANCE_LEVELS => {
    return Object.entries(IMPORTANCE_LEVELS).find(([_, p]) => p === points)?.[0] as keyof typeof IMPORTANCE_LEVELS || 'Normal'
  }

  const handleSave = () => {
    onSave(columnName, weights)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-gray-900">
              Configure Values: {columnName}
            </h2>
            <span className="text-sm text-gray-500">
              ({uniqueValues.length} values)
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

        {/* Assignment Section */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search for a value..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchTerm && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                  {filteredValues.map(value => (
                    <button
                      key={value}
                      onClick={() => {
                        setSelectedValue(value)
                        setSearchTerm(value)
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
                    >
                      {value}
                    </button>
                  ))}
                  {filteredValues.length === 0 && (
                    <div className="px-3 py-2 text-gray-500 text-sm">
                      No values found
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <select
              value={selectedImportance}
              onChange={(e) => setSelectedImportance(e.target.value as keyof typeof IMPORTANCE_LEVELS)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.entries(IMPORTANCE_LEVELS).map(([level, points]) => (
                <option key={level} value={level}>
                  {level} ({points})
                </option>
              ))}
            </select>
            
            <button
              onClick={handleAssign}
              disabled={!selectedValue}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Assign
            </button>
          </div>
        </div>

        {/* Current Assignments */}
        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Current Assignments</h3>
          
          <div className="space-y-2">
            {uniqueValues.map(value => {
              const importance = getImportanceLevelByPoints(weights[value] || 50)
              const points = weights[value] || 50
              
              return (
                <div key={value} className="flex items-center justify-between py-2 px-3 border border-gray-200 rounded hover:bg-gray-50">
                  <span className="text-sm text-gray-900 truncate flex-1 mr-4">{value}</span>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      importance === 'Very Important' ? 'bg-green-100 text-green-800' :
                      importance === 'Important' ? 'bg-blue-100 text-blue-800' :
                      importance === 'Normal' ? 'bg-gray-100 text-gray-800' :
                      importance === 'A Little Important' ? 'bg-orange-100 text-orange-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {importance} ({points})
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-500">
            Assign importance levels to values
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