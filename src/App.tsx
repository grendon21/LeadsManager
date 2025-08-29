import { useState, useEffect } from 'react'
import Papa from 'papaparse'
import CSVUploader from './components/CSVUploader'
import DataTable from './components/DataTable'
import SheetTab from './components/SheetTab'
import ActionsDropdown from './components/ActionsDropdown'
import LeadScoringModal from './components/LeadScoringModal'
import ImportModal from './components/ImportModal'

interface TableData {
  headers: string[]
  rows: string[][]
}

interface Sheet {
  id: string
  name: string
  data: TableData | null
}

const STORAGE_KEY = 'leadsmanager_sheets'

function App() {
  const [sheets, setSheets] = useState<Sheet[]>([])
  const [activeSheetId, setActiveSheetId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [isLeadScoringModalOpen, setIsLeadScoringModalOpen] = useState(false)
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)

  // Load sheets from localStorage on mount
  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY)
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData)
        if (parsedData && parsedData.sheets && parsedData.activeSheetId) {
          setSheets(parsedData.sheets)
          setActiveSheetId(parsedData.activeSheetId)
        } else {
          // Migrate old single sheet data
          const oldData = localStorage.getItem('leadsmanager_data')
          if (oldData) {
            const oldParsedData = JSON.parse(oldData)
            if (oldParsedData && oldParsedData.headers && oldParsedData.rows) {
              const newSheet: Sheet = {
                id: '1',
                name: 'Sheet 1',
                data: oldParsedData
              }
              setSheets([newSheet])
              setActiveSheetId('1')
              localStorage.removeItem('leadsmanager_data')
            }
          }
        }
      } catch (error) {
        console.error('Error loading saved data:', error)
        localStorage.removeItem(STORAGE_KEY)
      }
    }
    
    setIsLoading(false)
  }, [])

  // Create default sheet if none exist
  useEffect(() => {
    if (!isLoading && sheets.length === 0) {
      const defaultSheet: Sheet = {
        id: '1',
        name: 'Sheet 1',
        data: null
      }
      setSheets([defaultSheet])
      setActiveSheetId('1')
    }
  }, [isLoading, sheets])

  // Save sheets to localStorage whenever they change
  useEffect(() => {
    if (sheets.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        sheets,
        activeSheetId
      }))
    }
  }, [sheets, activeSheetId])

  const currentSheet = sheets.find(sheet => sheet.id === activeSheetId)

  const handleDataChange = (data: TableData | null) => {
    setSheets(prev => prev.map(sheet => 
      sheet.id === activeSheetId 
        ? { ...sheet, data }
        : sheet
    ))
  }

  const handleReset = () => {
    handleDataChange(null)
  }

  const addNewSheet = () => {
    const existingIds = sheets.map(s => parseInt(s.id)).filter(id => !isNaN(id))
    const newId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1
    const newSheet: Sheet = {
      id: newId.toString(),
      name: `Sheet ${newId}`,
      data: null
    }
    setSheets(prev => [...prev, newSheet])
    setActiveSheetId(newId.toString())
  }

  const renameSheet = (id: string, name: string) => {
    setSheets(prev => prev.map(sheet =>
      sheet.id === id ? { ...sheet, name } : sheet
    ))
  }

  const deleteSheet = (id: string) => {
    if (sheets.length <= 1) return // Don't delete the last sheet
    
    setSheets(prev => prev.filter(sheet => sheet.id !== id))
    
    if (id === activeSheetId) {
      const remainingSheets = sheets.filter(sheet => sheet.id !== id)
      setActiveSheetId(remainingSheets[0].id)
    }
  }

  const handleExportAll = () => {
    if (!currentSheet?.data) return
    
    const csvContent = Papa.unparse({
      fields: currentSheet.data.headers,
      data: currentSheet.data.rows
    })
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    link.setAttribute('href', url)
    link.setAttribute('download', `${currentSheet.name}-export.csv`)
    link.style.visibility = 'hidden'
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleConfigureLeadScoring = () => {
    setIsLeadScoringModalOpen(true)
  }

  const handleImport = () => {
    setIsImportModalOpen(true)
  }

  const handleLeadScoringSave = (weights: { [key: string]: number }) => {
    // TODO: Save lead scoring configuration and proceed to subcategory weights
    console.log('Lead scoring weights saved:', weights)
  }

  const handleDeleteSelectedRows = () => {
    if (!currentSheet?.data) return
    
    const newRows = currentSheet.data.rows.filter((_, index) => !selectedRows.has(index))
    handleDataChange({ headers: currentSheet.data.headers, rows: newRows })
    setSelectedRows(new Set())
  }

  const handleExportSelectedRows = () => {
    if (!currentSheet?.data) return
    
    const selectedRowsData = currentSheet.data.rows.filter((_, index) => selectedRows.has(index))
    
    const csvContent = Papa.unparse({
      fields: currentSheet.data.headers,
      data: selectedRowsData
    })
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    link.setAttribute('href', url)
    link.setAttribute('download', `${currentSheet.name}-selected-${selectedRows.size}-rows.csv`)
    link.style.visibility = 'hidden'
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleImportData = (data: { headers: string[]; rows: string[][] }, mode: 'replace' | 'new') => {
    if (mode === 'new') {
      // Create new sheet
      const existingIds = sheets.map(s => parseInt(s.id)).filter(id => !isNaN(id))
      const newId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1
      const newSheet = {
        id: newId.toString(),
        name: `Sheet ${newId}`,
        data
      }
      setSheets(prev => [...prev, newSheet])
      setActiveSheetId(newId.toString())
    } else {
      // Replace current sheet
      handleDataChange(data)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading saved data...</div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      <div className="flex-1 flex flex-col pb-12"> {/* Add bottom padding for footer */}
        {!currentSheet?.data ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="max-w-2xl w-full px-4">
              <div className="mb-8 text-center">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">LeadsManager</h1>
                <p className="text-gray-600">Upload and manage your CSV data with ease</p>
              </div>
              <CSVUploader onDataLoad={handleDataChange} />
            </div>
          </div>
        ) : (
          <>
            {/* Fixed header section - always visible */}
            <div className="flex-shrink-0 bg-white sticky top-0 z-50">
              <div className="px-4 py-3 border-b border-gray-200">
                <div>
                  <h1 className="text-xl font-bold text-gray-900">LeadsManager</h1>
                  <p className="text-sm text-gray-600">
                    CSV data management
                    <span className="text-green-600 ml-2">• Data auto-saved</span>
                  </p>
                </div>
              </div>
              
              {/* Controls bar - also sticky */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
                <div className="flex items-center gap-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {currentSheet.data?.rows.length || 0} rows
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  {selectedRows.size > 0 ? (
                    <>
                      <span className="text-sm text-gray-600 mr-2">
                        {selectedRows.size} row{selectedRows.size !== 1 ? 's' : ''} selected
                      </span>
                      <button
                        onClick={handleExportSelectedRows}
                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Export Selected
                      </button>
                      <button
                        onClick={handleDeleteSelectedRows}
                        className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete Selected
                      </button>
                    </>
                  ) : (
                    <ActionsDropdown 
                      onExportAll={handleExportAll}
                      onConfigureLeadScoring={handleConfigureLeadScoring}
                      onImport={handleImport}
                    />
                  )}
                </div>
              </div>
            </div>
            
            {/* Scrollable content area */}
            <div className="flex-1 overflow-hidden">
              <DataTable 
                data={currentSheet.data}
                onDataChange={handleDataChange}
                onReset={handleReset}
                onSelectedRowsChange={setSelectedRows}
              />
            </div>
          </>
        )}
      </div>
      
      {/* Clay-style Footer with Sheet Tabs - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 flex items-center gap-2 z-10">
        <div className="flex items-center gap-1">
          {sheets.map((sheet) => (
            <SheetTab
              key={sheet.id}
              sheet={sheet}
              isActive={sheet.id === activeSheetId}
              onClick={() => setActiveSheetId(sheet.id)}
              onRename={(name) => renameSheet(sheet.id, name)}
              onDelete={() => deleteSheet(sheet.id)}
              canDelete={sheets.length > 1}
            />
          ))}
        </div>
        <button
          onClick={addNewSheet}
          className="flex items-center gap-1 px-3 py-1 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add
        </button>
      </div>

      {/* Lead Scoring Modal */}
      <LeadScoringModal
        isOpen={isLeadScoringModalOpen}
        onClose={() => setIsLeadScoringModalOpen(false)}
        data={currentSheet?.data || { headers: [], rows: [] }}
        onSave={handleLeadScoringSave}
        onDataChange={handleDataChange}
      />

      {/* Import Modal */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImportData}
        hasExistingData={!!currentSheet?.data}
      />
    </div>
  )
}

export default App