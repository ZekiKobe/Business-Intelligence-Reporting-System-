import React, { useState, useMemo } from "react";
import { 
  FunnelIcon, 
  ChevronDownIcon, 
  ChevronUpIcon, 
  MagnifyingGlassIcon,
  XMarkIcon,
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EllipsisHorizontalIcon
} from "@heroicons/react/24/outline";

export interface Transaction {
  srl: number;
  txnDate: string;
  transCode: string;
  debit: number;
  credit: number;
  balance: number;
  remarks: string;
}

export interface ReportData {
  customerName: string;
  accountNo: string;
  accountType: string;
  period: string;
  currency: string;
  transactions: Transaction[];
}

interface FilterConfig {
  column: string;
  operator: string;
  value: string;
  value2?: string; // For between operator
}

const ReportTable: React.FC<{ data: ReportData }> = ({ data }) => {
  const [sortConfig, setSortConfig] = useState<{ key: keyof Transaction; direction: 'asc' | 'desc' } | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterConfig[]>([]);
  const [globalSearch, setGlobalSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Available filter operators
  const filterOperators = [
    { value: 'equals', label: 'Equals' },
    { value: 'contains', label: 'Contains' },
    { value: 'startsWith', label: 'Starts With' },
    { value: 'endsWith', label: 'Ends With' },
    { value: 'greaterThan', label: 'Greater Than' },
    { value: 'lessThan', label: 'Less Than' },
    { value: 'between', label: 'Between' },
  ];

  // Date-specific operators
  const dateOperators = [
    { value: 'equals', label: 'Equals' },
    { value: 'greaterThan', label: 'After' },
    { value: 'lessThan', label: 'Before' },
    { value: 'between', label: 'Between' },
  ];

  // Sort transactions
  const sortedTransactions = useMemo(() => {
    let sortableItems = [...data.transactions];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [data.transactions, sortConfig]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return sortedTransactions.filter(transaction => {
      // Apply global search
      if (globalSearch) {
        const searchLower = globalSearch.toLowerCase();
        const matchesGlobal = 
          transaction.srl.toString().includes(searchLower) ||
          transaction.txnDate.toLowerCase().includes(searchLower) ||
          transaction.transCode.toLowerCase().includes(searchLower) ||
          transaction.debit.toString().includes(searchLower) ||
          transaction.credit.toString().includes(searchLower) ||
          transaction.balance.toString().includes(searchLower) ||
          transaction.remarks.toLowerCase().includes(searchLower);
        
        if (!matchesGlobal) return false;
      }

      // Apply column filters
      return filters.every(filter => {
        const columnValue = transaction[filter.column as keyof Transaction];
        
        if (filter.column === 'txnDate') {
          // Date filtering
          const filterDate = new Date(filter.value);
          const cellDate = new Date(columnValue as string);
          
          switch (filter.operator) {
            case 'equals':
              return cellDate.toDateString() === filterDate.toDateString();
            case 'greaterThan':
              return cellDate > filterDate;
            case 'lessThan':
              return cellDate < filterDate;
            case 'between':
              const filterDate2 = new Date(filter.value2 || '');
              return cellDate >= filterDate && cellDate <= filterDate2;
            default:
              return true;
          }
        } else {
          // Text/number filtering
          const cellValue = String(columnValue).toLowerCase();
          const filterValue = filter.value.toLowerCase();
          
          switch (filter.operator) {
            case 'equals':
              return cellValue === filterValue;
            case 'contains':
              return cellValue.includes(filterValue);
            case 'startsWith':
              return cellValue.startsWith(filterValue);
            case 'endsWith':
              return cellValue.endsWith(filterValue);
            case 'greaterThan':
              return Number(columnValue) > Number(filter.value);
            case 'lessThan':
              return Number(columnValue) < Number(filter.value);
            case 'between':
              return Number(columnValue) >= Number(filter.value) && 
                     Number(columnValue) <= Number(filter.value2 || 0);
            default:
              return true;
          }
        }
      });
    });
  }, [sortedTransactions, globalSearch, filters]);

  // Pagination logic
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1); // Reset to first page when items per page changes
  };

  const requestSort = (key: keyof Transaction) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const addFilter = () => {
    setFilters([...filters, { column: 'srl', operator: 'equals', value: '' }]);
  };

  const updateFilter = (index: number, field: string, value: string) => {
    const newFilters = [...filters];
    newFilters[index] = { ...newFilters[index], [field]: value };
    setFilters(newFilters);
  };

  const removeFilter = (index: number) => {
    const newFilters = [...filters];
    newFilters.splice(index, 1);
    setFilters(newFilters);
  };

  const clearAllFilters = () => {
    setFilters([]);
    setGlobalSearch('');
    setCurrentPage(1);
  };

  const getOperatorLabel = (operator: string) => {
    return filterOperators.find(op => op.value === operator)?.label || operator;
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      // Show all pages if total pages is less than max visible
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always include first page
      pages.push(1);
      
      // Calculate start and end of visible pages
      let startPage = Math.max(2, currentPage - 1);
      let endPage = Math.min(totalPages - 1, currentPage + 1);
      
      // Adjust if we're near the beginning
      if (currentPage <= 3) {
        endPage = 4;
      }
      
      // Adjust if we're near the end
      if (currentPage >= totalPages - 2) {
        startPage = totalPages - 3;
      }
      
      // Add ellipsis after first page if needed
      if (startPage > 2) {
        pages.push('ellipsis-left');
      }
      
      // Add middle pages
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
      
      // Add ellipsis before last page if needed
      if (endPage < totalPages - 1) {
        pages.push('ellipsis-right');
      }
      
      // Always include last page
      pages.push(totalPages);
    }
    
    return pages;
  };

  return (
    <div className="bg-white rounded-xl md:rounded-2xl shadow-lg overflow-hidden">
      {/* Header Section */}
      <div className="p-4 md:p-6 border-b border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-4 md:mb-6">
          {/* Left Column */}
          <div className="text-left">
            <h2 className="text-lg md:text-xl font-semibold text-gray-800 mb-2">Account Statement</h2>
            <div className="space-y-1 text-xs md:text-sm text-gray-600">
              <p><span className="font-medium">Customer Name:</span> {data.customerName}</p>
              <p><span className="font-medium">Account No:</span> {data.accountNo}</p>
              <p><span className="font-medium">Account Type:</span> {data.accountType}</p>
            </div>
          </div>

          {/* Right Column */}
          <div className="text-left">
            <div className="mb-3 md:mb-4">
              <span className="inline-flex items-center px-2.5 py-0.5 md:px-3 md:py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {data.currency}
              </span>
            </div>
            <div className="space-y-1 text-xs md:text-sm text-gray-600">
              <p><span className="font-medium">Period:</span> {data.period}</p>
              <p><span className="font-medium">Transactions:</span> {filteredTransactions.length} of {data.transactions.length}</p>
            </div>
          </div>
        </div>

        {/* Search and Filter Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-4 w-4 md:h-5 md:w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search across all columns..."
              className="block w-full pl-10 pr-3 py-1.5 md:py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center px-2.5 py-1.5 md:px-3 md:py-2 border rounded-md text-xs md:text-sm font-medium ${
                showFilters || filters.length > 0
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
              }`}
            >
              <FunnelIcon className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1" />
              <span className="hidden sm:inline">Filters</span> {filters.length > 0 && `(${filters.length})`}
            </button>

            {(filters.length > 0 || globalSearch) && (
              <button
                onClick={clearAllFilters}
                className="inline-flex items-center px-2.5 py-1.5 md:px-3 md:py-2 border border-gray-300 rounded-md text-xs md:text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Clear All
              </button>
            )}
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mt-3 md:mt-4 p-3 md:p-4 bg-gray-50 rounded-md border border-gray-200">
            <div className="flex items-center justify-between mb-2 md:mb-3">
              <h3 className="text-xs md:text-sm font-medium text-gray-700">Column Filters</h3>
              <button
                onClick={addFilter}
                className="text-xs md:text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                + Add Filter
              </button>
            </div>

            {filters.length === 0 ? (
              <p className="text-xs md:text-sm text-gray-500 italic">No filters applied. Click "Add Filter" to create one.</p>
            ) : (
              <div className="space-y-2 md:space-y-3">
                {filters.map((filter, index) => (
                  <div key={index} className="flex flex-col sm:flex-row sm:items-center gap-2 p-2 md:p-3 bg-white rounded-md border border-gray-200">
                    <select
                      className="block w-full sm:w-32 md:w-40 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 py-1.5 md:py-2 text-xs md:text-sm"
                      value={filter.column}
                      onChange={(e) => updateFilter(index, 'column', e.target.value)}
                    >
                      <option value="srl">Serial No</option>
                      <option value="txnDate">Date</option>
                      <option value="transCode">Trans Code</option>
                      <option value="debit">Debit</option>
                      <option value="credit">Credit</option>
                      <option value="balance">Balance</option>
                      <option value="remarks">Remarks</option>
                    </select>

                    <select
                      className="block w-full sm:w-32 md:w-40 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 py-1.5 md:py-2 text-xs md:text-sm"
                      value={filter.operator}
                      onChange={(e) => updateFilter(index, 'operator', e.target.value)}
                    >
                      {(filter.column === 'txnDate' ? dateOperators : filterOperators).map(op => (
                        <option key={op.value} value={op.value}>{op.label}</option>
                      ))}
                    </select>

                    <input
                      type={filter.column === 'txnDate' ? 'date' : 'text'}
                      className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 py-1.5 md:py-2 px-2 md:px-3 text-xs md:text-sm"
                      value={filter.value}
                      onChange={(e) => updateFilter(index, 'value', e.target.value)}
                      placeholder="Value"
                    />

                    {filter.operator === 'between' && (
                      <input
                        type={filter.column === 'txnDate' ? 'date' : 'text'}
                        className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 py-1.5 md:py-2 px-2 md:px-3 text-xs md:text-sm"
                        value={filter.value2 || ''}
                        onChange={(e) => updateFilter(index, 'value2', e.target.value)}
                        placeholder="Second value"
                      />
                    )}

                    <button
                      onClick={() => removeFilter(index)}
                      className="text-gray-400 hover:text-gray-600 p-1"
                    >
                      <XMarkIcon className="h-4 w-4 md:h-5 md:w-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Table Section */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {[
                { key: 'srl', label: 'Srl' },
                { key: 'txnDate', label: 'Txn Date' },
                { key: 'transCode', label: 'Trans Code' },
                { key: 'debit', label: 'Debit' },
                { key: 'credit', label: 'Credit' },
                { key: 'balance', label: 'Balance' },
                { key: 'remarks', label: 'Remarks' }
              ].map((column) => (
                <th
                  key={column.key}
                  className="px-4 md:px-6 py-2 md:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => requestSort(column.key as keyof Transaction)}
                >
                  <div className="flex items-center">
                    {column.label}
                    {sortConfig && sortConfig.key === column.key && (
                      sortConfig.direction === 'asc' ? 
                        <ChevronUpIcon className="ml-1 h-3 w-3 md:h-4 md:w-4" /> : 
                        <ChevronDownIcon className="ml-1 h-3 w-3 md:h-4 md:w-4" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedTransactions.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 md:px-6 py-6 md:py-8 text-center">
                  <div className="flex flex-col items-center justify-center text-gray-500">
                    <FunnelIcon className="h-10 w-10 md:h-12 md:w-12 text-gray-300 mb-2" />
                    <p className="font-medium text-sm md:text-base">No transactions match your filters</p>
                    <p className="text-xs md:text-sm mt-1">Try adjusting your search or filter criteria</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedTransactions.map((tx) => (
                <tr key={tx.srl} className="hover:bg-gray-50">
                  <td className="px-4 md:px-6 py-3 md:py-4 whitespace-nowrap text-xs md:text-sm font-medium text-gray-900">{tx.srl}</td>
                  <td className="px-4 md:px-6 py-3 md:py-4 whitespace-nowrap text-xs md:text-sm text-gray-900">
                    <div className="flex items-center">
                      <CalendarDaysIcon className="h-3 w-3 md:h-4 md:w-4 text-gray-400 mr-1" />
                      {tx.txnDate}
                    </div>
                  </td>
                  <td className="px-4 md:px-6 py-3 md:py-4 whitespace-nowrap text-xs md:text-sm text-gray-900">
                    <span className="inline-flex items-center px-2 py-0.5 md:px-2.5 md:py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {tx.transCode}
                    </span>
                  </td>
                  <td className="px-4 md:px-6 py-3 md:py-4 whitespace-nowrap text-xs md:text-sm text-right text-red-600 font-medium">
                    {tx.debit !== 0 ? tx.debit.toLocaleString() : '-'}
                  </td>
                  <td className="px-4 md:px-6 py-3 md:py-4 whitespace-nowrap text-xs md:text-sm text-right text-green-600 font-medium">
                    {tx.credit !== 0 ? tx.credit.toLocaleString() : '-'}
                  </td>
                  <td className="px-4 md:px-6 py-3 md:py-4 whitespace-nowrap text-xs md:text-sm text-right text-gray-900 font-bold">
                    {tx.balance.toLocaleString()}
                  </td>
                  <td className="px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm text-gray-900 max-w-xs truncate" title={tx.remarks}>
                    {tx.remarks}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {filteredTransactions.length > 0 && (
        <div className="px-4 md:px-6 py-3 md:py-4 bg-gray-50 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 md:gap-4">
            <div className="flex items-center">
              <span className="text-xs md:text-sm text-gray-700 mr-2 md:mr-3">Show</span>
              <select
                value={itemsPerPage}
                onChange={handleItemsPerPageChange}
                className="border border-gray-300 rounded-md py-1 px-1.5 md:py-1 md:px-2 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
              <span className="text-xs md:text-sm text-gray-700 ml-2 md:ml-3">entries per page</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-xs md:text-sm text-gray-700">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredTransactions.length)} of {filteredTransactions.length} entries
              </span>
            </div>
          </div>
          
          {/* Pagination Navigation */}
          <div className="flex justify-center mt-3 md:mt-4">
            <nav className="inline-flex items-center space-x-1">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-2 py-1 md:px-3 md:py-1 rounded-md border border-gray-300 text-xs md:text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeftIcon className="h-3 w-3 md:h-4 md:w-4" />
              </button>
              
              {getPageNumbers().map((page, index) => {
                if (page === 'ellipsis-left' || page === 'ellipsis-right') {
                  return (
                    <span key={index} className="px-2 py-1 md:px-3 md:py-1 text-gray-500">
                      <EllipsisHorizontalIcon className="h-3 w-3 md:h-4 md:w-4" />
                    </span>
                  );
                }
                
                return (
                  <button
                    key={index}
                    onClick={() => handlePageChange(page as number)}
                    className={`px-2 py-1 md:px-3 md:py-1 rounded-md border text-xs md:text-sm font-medium ${
                      currentPage === page
                        ? 'border-blue-500 bg-blue-500 text-white'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-2 py-1 md:px-3 md:py-1 rounded-md border border-gray-300 text-xs md:text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRightIcon className="h-3 w-3 md:h-4 md:w-4" />
              </button>
            </nav>
          </div>
          
          {filters.length > 0 && (
            <div className="mt-3 md:mt-4">
              <span className="text-xs text-gray-500 mr-2">Active filters:</span>
              {filters.map((filter, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-1.5 py-0.5 md:px-2 md:py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mr-1 mb-1"
                >
                  {filter.column}: {getOperatorLabel(filter.operator)} {filter.value}
                  {filter.operator === 'between' && ` and ${filter.value2}`}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReportTable;