# LeadsManager

A Clay-inspired CSV data management tool built with React, TypeScript, and Tailwind CSS.

## Features

- **CSV Upload**: Drag-and-drop or click to upload CSV files
- **Frozen Headers & Columns**: First row (headers) and first column (checkboxes + row numbers) stay frozen while scrolling
- **Resizable Columns**: Drag column borders to resize widths
- **Column Reordering**: Drag column headers to reorder them
- **Cell Editing**: Double-click any cell to edit its content
- **Row Management**: 
  - Select individual rows or all rows with checkboxes
  - Delete selected rows
  - Add new rows via "New row" at bottom of table
- **Column Management**: 
  - Right-click column headers for context menu
  - Rename columns, insert columns left/right, delete columns
  - Add new columns via "Add Column" header
- **Data Export**: Export all data or just selected rows to CSV
- **Auto-persistence**: Data automatically saves to localStorage and survives page refreshes

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Vite** - Build tool and dev server
- **@dnd-kit** - Drag and drop functionality
- **Papa Parse** - CSV parsing and generation

## Getting Started

### Prerequisites
- Node.js 16+ and npm

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/LeadsManager.git
   cd LeadsManager
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:5173](http://localhost:5173) to view it in the browser.

## Usage

1. **Upload CSV**: Drag and drop a CSV file or click "Choose File" to upload your data
2. **Navigate**: Use frozen headers and columns to easily navigate large datasets
3. **Edit Data**: Double-click cells to edit, drag columns to reorder, resize as needed
4. **Manage Rows**: Select rows with checkboxes, delete selected, or add new rows
5. **Manage Columns**: Right-click column headers to rename, insert, or delete columns
6. **Export**: Use "Export All" or "Export Selected" to download your modified data

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Architecture

- **App.tsx** - Main app component with data persistence
- **CSVUploader.tsx** - File upload component with drag-and-drop
- **DataTable.tsx** - Main table component with all functionality
- **SortableColumn.tsx** - Individual column header with drag/edit/menu capabilities
- **EditableCell.tsx** - Individual cell with inline editing

## License

MIT License - feel free to use this project for your own purposes.