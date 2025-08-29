import { useState } from 'react'
import Papa from 'papaparse'

interface ImportModalProps {
  isOpen: boolean
  onClose: () => void
  onImport: (data: { headers: string[]; rows: string[][] }, mode: 'replace' | 'new') => void
  hasExistingData: boolean
}

export default function ImportModal({ isOpen, onClose, onImport, hasExistingData }: ImportModalProps) {
  const [csvData, setCsvData] = useState<{ headers: string[]; rows: string[][] } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedMode, setSelectedMode] = useState<'replace' | 'new'>('new')

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    setError(null)

    Papa.parse(file, {
      header: false,
      complete: (results) => {
        try {
          const data = results.data as string[][]
          
          if (data.length === 0) {
            setError('The CSV file appears to be empty.')
            setIsLoading(false)
            return
          }

          const headers = data[0] || []
          const rows = data.slice(1).filter(row => row.some(cell => cell && cell.trim()))

          if (headers.length === 0) {
            setError('No headers found in the CSV file.')
            setIsLoading(false)
            return
          }

          setCsvData({ headers, rows })
          setIsLoading(false)
        } catch (err) {
          setError('Failed to parse CSV file. Please check the file format.')
          setIsLoading(false)
        }
      },
      error: (err) => {
        setError(`Error reading file: ${err.message}`)
        setIsLoading(false)
      }
    })
  }

  const handleImport = () => {
    if (csvData) {
      onImport(csvData, selectedMode)
      handleClose()
    }
  }

  const handleClose = () => {
    setCsvData(null)
    setError(null)
    setSelectedMode('new')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Import CSV</h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {!csvData ? (
            <div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select CSV file
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  disabled={isLoading}
                />
              </div>

              {isLoading && (
                <div className="text-center py-4">
                  <div className="text-sm text-gray-600">Processing CSV file...</div>
                </div>
              )}

              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <div className="text-sm text-red-600">{error}</div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                <div className="text-sm text-green-600">
                  CSV loaded successfully: {csvData.headers.length} columns, {csvData.rows.length} rows
                </div>
              </div>

              {hasExistingData && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Import option
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="importMode"
                        value="new"
                        checked={selectedMode === 'new'}
                        onChange={(e) => setSelectedMode(e.target.value as 'new')}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Create new sheet</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="importMode"
                        value="replace"
                        checked={selectedMode === 'replace'}
                        onChange={(e) => setSelectedMode(e.target.value as 'replace')}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Replace current sheet</span>
                    </label>
                  </div>
                </div>
              )}

              <div className="flex gap-3 justify-end">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Import
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}