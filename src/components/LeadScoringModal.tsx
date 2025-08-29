import { useState, useEffect } from 'react'

interface SavedScore {
  id: string
  name: string
  weights: { [key: string]: number }
  subcategoryWeights: { [columnName: string]: { [value: string]: number } }
  includedColumns: string[]
  createdAt: string
}

interface TableData {
  headers: string[]
  rows: string[][]
}

interface LeadScoringModalProps {
  isOpen: boolean
  onClose: () => void
  data: TableData
  onSave: (weights: { [key: string]: number }) => void
  onDataChange?: (data: TableData) => void
}

const IMPORTANCE_LEVELS = {
  'Very Important': 100,
  'Important': 75,
  'Normal': 50,
  'A Little Important': 25,
  'Not Important': 0
}

export default function LeadScoringModal({ isOpen, onClose, data, onSave, onDataChange }: LeadScoringModalProps) {
  const [weights, setWeights] = useState<{ [key: string]: number }>({})
  const [showInfo, setShowInfo] = useState(false)
  const [subcategoryWeights, setSubcategoryWeights] = useState<{ [columnName: string]: { [value: string]: number } }>({})
  const [expandedColumn, setExpandedColumn] = useState<string>('')
  const [selectedValue, setSelectedValue] = useState<string>('')
  const [selectedImportance, setSelectedImportance] = useState<keyof typeof IMPORTANCE_LEVELS>('Normal')
  const [includedColumns, setIncludedColumns] = useState<string[]>([])
  const [savedScores, setSavedScores] = useState<SavedScore[]>([])
  const [scoreName, setScoreName] = useState<string>('')
  const [showSaveDialog, setShowSaveDialog] = useState<boolean>(false)

  // Initialize weights when modal opens - start with no columns included
  useEffect(() => {
    if (isOpen && data.headers.length > 0) {
      setWeights({})
      setIncludedColumns([])
      setExpandedColumn('')
      setScoreName('')
      setShowSaveDialog(false)
      // Load saved scores from localStorage
      const saved = localStorage.getItem('leadsmanager_saved_scores')
      if (saved) {
        try {
          setSavedScores(JSON.parse(saved))
        } catch (error) {
          console.error('Error loading saved scores:', error)
        }
      }
    }
  }, [isOpen, data.headers])

  // Update weights when included columns change
  useEffect(() => {
    if (includedColumns.length > 0) {
      const equalWeight = Math.floor(100 / includedColumns.length)
      const remainder = 100 - (equalWeight * includedColumns.length)
      const newWeights: { [key: string]: number } = {}
      
      includedColumns.forEach((header, index) => {
        newWeights[header] = equalWeight + (index === 0 ? remainder : 0)
      })
      
      setWeights(newWeights)
    }
  }, [includedColumns])

  const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0)
  const isValidWeight = totalWeight === 100 && includedColumns.length > 0

  const addColumn = (header: string) => {
    if (!includedColumns.includes(header)) {
      setIncludedColumns(prev => [...prev, header])
    }
  }

  const removeColumn = (header: string) => {
    setIncludedColumns(prev => prev.filter(col => col !== header))
    setWeights(prev => {
      const newWeights = { ...prev }
      delete newWeights[header]
      return newWeights
    })
    if (expandedColumn === header) {
      setExpandedColumn('')
    }
  }

  const handleWeightChange = (header: string, value: string) => {
    const numValue = parseInt(value) || 0
    setWeights(prev => ({
      ...prev,
      [header]: Math.max(0, Math.min(100, numValue))
    }))
  }

  const handleSave = () => {
    if (isValidWeight) {
      onSave(weights)
      onClose()
    }
  }

  const handleSaveScore = () => {
    if (!scoreName.trim() || !isValidWeight) return

    const newScore: SavedScore = {
      id: Date.now().toString(),
      name: scoreName.trim(),
      weights: { ...weights },
      subcategoryWeights: { ...subcategoryWeights },
      includedColumns: [...includedColumns],
      createdAt: new Date().toISOString()
    }

    const updatedScores = [...savedScores, newScore]
    setSavedScores(updatedScores)
    localStorage.setItem('leadsmanager_saved_scores', JSON.stringify(updatedScores))
    setScoreName('')
    setShowSaveDialog(false)
  }

  const handleLoadScore = (score: SavedScore) => {
    setWeights(score.weights)
    setSubcategoryWeights(score.subcategoryWeights)
    setIncludedColumns(score.includedColumns)
  }

  const handleDeleteScore = (scoreId: string) => {
    const updatedScores = savedScores.filter(score => score.id !== scoreId)
    setSavedScores(updatedScores)
    localStorage.setItem('leadsmanager_saved_scores', JSON.stringify(updatedScores))
  }

  const calculateRowScore = (row: string[]) => {
    let totalScore = 0

    includedColumns.forEach(columnName => {
      const columnIndex = data.headers.indexOf(columnName)
      if (columnIndex === -1) return

      const cellValue = row[columnIndex]
      if (!cellValue || !cellValue.trim()) return

      // Get column weight (as percentage)
      const columnWeight = weights[columnName] || 0

      // Get subcategory weight (default to 50 if not set)
      const subcategoryWeight = subcategoryWeights[columnName]?.[cellValue] || 50

      // Add to total score: (columnWeight / 100) * subcategoryWeight
      totalScore += (columnWeight / 100) * subcategoryWeight
    })

    return Math.round(totalScore * 100) / 100 // Round to 2 decimal places
  }

  const handleApplyScoreToData = () => {
    if (!onDataChange || !isValidWeight) return

    const scoreColumnName = 'Lead Score'
    
    // Check if Lead Score column already exists
    let newHeaders = [...data.headers]
    let scoreColumnIndex = newHeaders.indexOf(scoreColumnName)
    
    if (scoreColumnIndex === -1) {
      // Add new column
      newHeaders.push(scoreColumnName)
      scoreColumnIndex = newHeaders.length - 1
    }

    // Calculate scores for all rows
    const newRows = data.rows.map(row => {
      const newRow = [...row]
      // Ensure row has enough columns
      while (newRow.length < newHeaders.length) {
        newRow.push('')
      }
      // Set the score
      newRow[scoreColumnIndex] = calculateRowScore(row).toString()
      return newRow
    })

    const newData: TableData = {
      headers: newHeaders,
      rows: newRows
    }

    onDataChange(newData)
    onClose()
  }

  const getUniqueValues = (header: string) => {
    const columnIndex = data.headers.indexOf(header)
    if (columnIndex === -1) return []
    
    const values = data.rows.map(row => row[columnIndex]).filter(val => val && val.trim())
    return [...new Set(values)].slice(0, 5) // Show first 5 unique values as examples
  }

  const handleRowClick = (columnName: string) => {
    setExpandedColumn(expandedColumn === columnName ? '' : columnName)
    setSelectedValue('')
  }

  const getUniqueValuesForColumn = (columnName: string) => {
    const columnIndex = data.headers.indexOf(columnName)
    if (columnIndex === -1) return []
    
    const values = data.rows
      .map(row => row[columnIndex])
      .filter(val => val && val.trim())
    
    return [...new Set(values)].sort()
  }

  const handleAssignImportance = (columnName: string) => {
    if (selectedValue) {
      setSubcategoryWeights(prev => ({
        ...prev,
        [columnName]: {
          ...prev[columnName],
          [selectedValue]: IMPORTANCE_LEVELS[selectedImportance]
        }
      }))
      setSelectedValue('')
    }
  }

  const getImportanceLevelByPoints = (points: number): keyof typeof IMPORTANCE_LEVELS => {
    return Object.entries(IMPORTANCE_LEVELS).find(([_, p]) => p === points)?.[0] as keyof typeof IMPORTANCE_LEVELS || 'Normal'
  }

  const hasSubcategoryWeights = (columnName: string) => {
    return subcategoryWeights[columnName] && Object.keys(subcategoryWeights[columnName]).length > 0
  }

  const availableColumns = data.headers.filter(header => !includedColumns.includes(header))

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-gray-900">Configure Lead Scoring</h2>
            <button
              onClick={() => setShowInfo(!showInfo)}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
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

        {/* Info Panel */}
        {showInfo && (
          <div className="p-4 bg-blue-50 border-b border-gray-200">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-2">How Lead Scoring Works:</p>
                <div className="space-y-1">
                  <p><strong>Formula:</strong> Lead Score = Σ(Column Weight × Subcategory Weight)</p>
                  <p><strong>Column Weights:</strong> Must total 100% across all columns</p>
                  <p><strong>Subcategory Weights:</strong> 0-100 scale for each unique value within a column</p>
                  <p className="mt-2 text-xs text-blue-600">Example: If "Company Size" has 30% weight and "Enterprise" subcategory has 90 weight, that contributes 27 points (30% × 90) to the total lead score.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content - Sidebar Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar - Available Columns and Saved Scores */}
          <div className="w-80 flex-shrink-0 border-r border-gray-200 bg-gray-50 flex flex-col">
            {/* Saved Scores Section */}
            {savedScores.length > 0 && (
              <div className="border-b border-gray-200">
                <div className="p-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Saved Scores</h3>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {savedScores.map(score => (
                      <div key={score.id} className="flex items-center justify-between p-2 bg-white border border-gray-200 rounded text-xs">
                        <button
                          onClick={() => handleLoadScore(score)}
                          className="flex-1 text-left truncate hover:text-blue-600"
                          title={score.name}
                        >
                          {score.name}
                        </button>
                        <button
                          onClick={() => handleDeleteScore(score.id)}
                          className="ml-2 text-red-500 hover:text-red-700 p-1"
                          title="Delete"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {/* Available Columns */}
            <div className="flex-1 overflow-hidden">
              <div className="p-4 space-y-2 overflow-y-auto">
              {availableColumns.map(header => (
                <div
                  key={header}
                  onClick={() => addColumn(header)}
                  className="p-3 bg-white border border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all"
                >
                  <h4 className="font-medium text-sm text-gray-900">{header}</h4>
                </div>
              ))}
              {availableColumns.length === 0 && (
                <div className="text-center py-8 text-gray-500 text-sm">
                  All columns are included
                </div>
              )}
              </div>
            </div>
          </div>

          {/* Right Side - Included Columns Configuration */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="p-4 bg-white">
              <div className="flex items-center justify-end">
                <div className={`text-sm font-medium ${isValidWeight ? 'text-green-600' : 'text-red-600'}`}>
                  Total: {totalWeight}% {isValidWeight ? '✓' : '(must equal 100%)'}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {includedColumns.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <div className="text-lg mb-2">👈</div>
                    <p className="text-sm">Select columns from the left to include in scoring</p>
                  </div>
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  {includedColumns.map(header => (
                    <div key={header} className="border border-gray-200 rounded-lg bg-white">
                      {/* Column Header */}
                      <div
                        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => handleRowClick(header)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <svg className={`w-4 h-4 text-gray-400 transition-transform ${expandedColumn === header ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                            <h4 className="font-medium text-gray-900">{header}</h4>
                            {hasSubcategoryWeights(header) && (
                              <div className="w-2 h-2 bg-green-500 rounded-full" title="Values configured" />
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={weights[header] || 0}
                                onChange={(e) => {
                                  e.stopPropagation()
                                  handleWeightChange(header, e.target.value)
                                }}
                                className="w-16 px-2 py-1 border border-gray-300 rounded text-right text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <span className="text-sm text-gray-500">%</span>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                removeColumn(header)
                              }}
                              className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
                              title="Remove column"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Content */}
                      {expandedColumn === header && (
                        <div className="px-4 pb-4 border-t border-gray-100 bg-gray-50">
                          <div className="pt-4 space-y-4">
                            {/* Assignment Section */}
                            <div className="flex items-center gap-3">
                              <select
                                value={selectedValue}
                                onChange={(e) => setSelectedValue(e.target.value)}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="">Select a value...</option>
                                {getUniqueValuesForColumn(header).map(value => (
                                  <option key={value} value={value}>{value}</option>
                                ))}
                              </select>
                              
                              <select
                                value={selectedImportance}
                                onChange={(e) => setSelectedImportance(e.target.value as keyof typeof IMPORTANCE_LEVELS)}
                                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                style={{
                                  backgroundColor: selectedImportance === 'Very Important' ? '#065f46' :
                                                 selectedImportance === 'Important' ? '#16a34a' :
                                                 selectedImportance === 'Normal' ? '#6b7280' :
                                                 selectedImportance === 'A Little Important' ? '#eab308' :
                                                 '#dc2626',
                                  color: 'white'
                                }}
                              >
                                {Object.entries(IMPORTANCE_LEVELS).map(([level, points]) => (
                                  <option 
                                    key={level} 
                                    value={level}
                                    style={{
                                      backgroundColor: level === 'Very Important' ? '#065f46' :
                                                     level === 'Important' ? '#16a34a' :
                                                     level === 'Normal' ? '#6b7280' :
                                                     level === 'A Little Important' ? '#eab308' :
                                                     '#dc2626',
                                      color: 'white'
                                    }}
                                  >
                                    {level}
                                  </option>
                                ))}
                              </select>
                              
                              <button
                                onClick={() => handleAssignImportance(header)}
                                disabled={!selectedValue}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
                              >
                                Assign
                              </button>
                            </div>

                            {/* Current Assignments */}
                            {subcategoryWeights[header] && Object.keys(subcategoryWeights[header]).length > 0 && (
                              <div>
                                <h5 className="text-sm font-medium text-gray-700 mb-2">Current Assignments:</h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {Object.entries(subcategoryWeights[header]).map(([value, points]) => {
                                    const importance = getImportanceLevelByPoints(points)
                                    return (
                                      <div key={value} className="flex items-center justify-between py-1 px-2 bg-white border border-gray-200 rounded text-sm">
                                        <span className="truncate flex-1 mr-2">{value}</span>
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium text-white ${
                                          importance === 'Very Important' ? 'bg-green-800' :
                                          importance === 'Important' ? 'bg-green-500' :
                                          importance === 'Normal' ? 'bg-gray-500' :
                                          importance === 'A Little Important' ? 'bg-yellow-500' :
                                          'bg-red-600'
                                        }`}>
                                          {importance}
                                        </span>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Save Dialog */}
        {showSaveDialog && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
            <div className="bg-white rounded-lg shadow-xl p-6 w-96">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Save Scoring Configuration</h3>
              <input
                type="text"
                placeholder="Enter a name for this score..."
                value={scoreName}
                onChange={(e) => setScoreName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                autoFocus
                onKeyPress={(e) => e.key === 'Enter' && handleSaveScore()}
              />
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowSaveDialog(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveScore}
                  disabled={!scoreName.trim()}
                  className={`px-4 py-2 rounded-md font-medium ${
                    scoreName.trim()
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSaveDialog(true)}
              disabled={!isValidWeight}
              className={`px-4 py-2 rounded-md font-medium ${
                isValidWeight
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Save Score
            </button>
            {onDataChange && (
              <button
                onClick={handleApplyScoreToData}
                disabled={!isValidWeight}
                className={`px-4 py-2 rounded-md font-medium ${
                  isValidWeight
                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Apply to Data
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!isValidWeight}
              className={`px-4 py-2 rounded-md font-medium ${
                isValidWeight
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}