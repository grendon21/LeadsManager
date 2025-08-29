import { useState, useEffect } from 'react'
import CSVUploader from './components/CSVUploader'
import DataTable from './components/DataTable'

interface TableData {
  headers: string[]
  rows: string[][]
}

const STORAGE_KEY = 'leadsmanager_data'

function App() {
  const [tableData, setTableData] = useState<TableData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load data from localStorage on mount
  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY)
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData)
        if (parsedData && parsedData.headers && parsedData.rows) {
          setTableData(parsedData)
        }
      } catch (error) {
        console.error('Error loading saved data:', error)
        localStorage.removeItem(STORAGE_KEY)
      }
    }
    setIsLoading(false)
  }, [])

  // Save data to localStorage whenever it changes
  const handleDataChange = (data: TableData | null) => {
    setTableData(data)
    if (data) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  const handleReset = () => {
    setTableData(null)
    localStorage.removeItem(STORAGE_KEY)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading saved data...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">LeadsManager</h1>
          <p className="text-gray-600">
            Upload and manage your CSV data with ease
            {tableData && <span className="text-green-600 ml-2">• Data auto-saved</span>}
          </p>
        </div>
        
        {!tableData ? (
          <CSVUploader onDataLoad={handleDataChange} />
        ) : (
          <DataTable 
            data={tableData}
            onDataChange={handleDataChange}
            onReset={handleReset}
          />
        )}
      </div>
    </div>
  )
}

export default App