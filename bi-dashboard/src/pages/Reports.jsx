import { 
  Plus, 
  Filter, 
  ChevronLeft, 
  ChevronRight,
  Edit,
  Eye,
  Trash2
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

const Reports = () => {
  const [reports, setReports] = useState([
    { id: 1, title: 'Sales Report', group: 'Sales', createdBy: 'John Doe', createdDate: '2023-05-01', type: 'Bar Chart' },
    { id: 2, title: 'Revenue Analysis', group: 'Finance', createdBy: 'Jane Smith', createdDate: '2023-05-10', type: 'Pie Chart' },
    { id: 3, title: 'User Activity', group: 'Operations', createdBy: 'Robert Johnson', createdDate: '2023-05-15', type: 'Line Chart' },
    { id: 4, title: 'Marketing ROI', group: 'Marketing', createdBy: 'Sarah Williams', createdDate: '2023-05-20', type: 'Table' },
  ]);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-dark">Reports</h2>
        <Link
      to="/reports/design"
      className="bg-green-500 text-white px-4 py-2 rounded-md flex items-center"
    >
      <Plus size={16} className="mr-2" /> Design report
    </Link>
      </div>
      
      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center">
            <Filter size={16} className="text-gray-500 mr-2" />
            <span className="text-sm text-gray-700">Filter:</span>
          </div>
          <select className="text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent">
            <option>All Groups</option>
            <option>Sales</option>
            <option>Finance</option>
            <option>Marketing</option>
            <option>Operations</option>
          </select>
          <select className="text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent">
            <option>All Types</option>
            <option>Bar Chart</option>
            <option>Pie Chart</option>
            <option>Line Chart</option>
            <option>Table</option>
          </select>
          <input 
            type="text" 
            placeholder="Search reports..." 
            className="text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
      </div>
      
      {/* Reports Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Group</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created By</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {reports.map(report => (
              <tr key={report.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-dark">{report.title}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{report.group}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{report.createdBy}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{report.createdDate}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-info">{report.type}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                  <button className="text-info hover:text-blue-700 mr-3">
                    <Edit size={16} />
                  </button>
                  <button className="text-danger hover:text-red-700">
                    <Trash2 size={16} />
                  </button>
                  <Link to='/view-report' >
                  <button className="text-danger hover:text-red-700 ml-3"><Eye size={16} /></button>
                    
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="bg-white px-6 py-3 flex items-center justify-between border-t border-gray-200">
          <div className="flex-1 flex justify-between items-center">
            <p className="text-sm text-gray-700">
              Showing <span className="font-medium">1</span> to <span className="font-medium">10</span> of <span className="font-medium">97</span> results
            </p>
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
              <button className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                <ChevronLeft size={16} />
              </button>
              <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">1</button>
              <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">2</button>
              <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">3</button>
              <button className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                <ChevronRight size={16} />
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Reports;
