import { useRef, useState } from 'react'
import Papa from 'papaparse'

interface CSVUploaderProps {
  onDataLoad: (data: { headers: string[], rows: string[][] }) => void
}

export default function CSVUploader({ onDataLoad }: CSVUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please select a CSV file')
      return
    }

    setIsLoading(true)
    setError(null)

    Papa.parse(file, {
      complete: (results) => {
        if (results.errors.length > 0) {
          setError('Error parsing CSV file')
          setIsLoading(false)
          return
        }

        const data = results.data as string[][]
        if (data.length === 0) {
          setError('CSV file is empty')
          setIsLoading(false)
          return
        }

        const headers = data[0]
        const rows = data.slice(1).filter(row => row.some(cell => cell.trim() !== ''))

        onDataLoad({ headers, rows })
        setIsLoading(false)
      },
      error: () => {
        setError('Error reading CSV file')
        setIsLoading(false)
      },
      header: false,
      skipEmptyLines: true
    })
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const files = event.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      if (fileInputRef.current) {
        fileInputRef.current.files = files
        handleFileSelect({ target: { files } } as React.ChangeEvent<HTMLInputElement>)
      }
    }
  }

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div
        className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-gray-400 transition-colors"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <div className="mb-4">
          <svg
            className="w-12 h-12 text-gray-400 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
        </div>
        
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Upload your CSV file
        </h3>
        <p className="text-gray-500 mb-6">
          Drag and drop your CSV file here, or click to browse
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          className="hidden"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
        >
          {isLoading ? 'Processing...' : 'Choose File'}
        </button>

        {error && (
          <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
      </div>

      <div className="mt-8 text-sm text-gray-600">
        <h4 className="font-medium mb-2">Supported features:</h4>
        <ul className="list-disc list-inside space-y-1">
          <li>Frozen header row and first column for easy navigation</li>
          <li>Row numbers and checkboxes in frozen first column</li>
          <li>Resize columns by dragging column borders</li>
          <li>Reorder columns by dragging column headers</li>
          <li>Edit cells by double-clicking</li>
          <li>Select and delete multiple rows</li>
          <li>Add new columns and rows</li>
          <li>Export data back to CSV (all or selected rows)</li>
          <li>Automatic data persistence across browser refreshes</li>
        </ul>
      </div>
    </div>
  )
}