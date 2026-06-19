import { X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import {createReportGroup} from '../controllers/reportController';

const CreateReportGroupModal = ({ isOpen, onClose, onSave, groupData }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');


  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const reportGroupData = {
      code: code,
      group_name: name,
      description: description,
    };
    try {
      const created = await createReportGroup(reportGroupData);
      onSave?.({
        code: created?.code || code,
        name,
        group_name: name,
        description,
        count: created?.reports?.length || 0,
      });
      toast.success(`Report group "${name}" created successfully`);

      setName("");
      setCode("");
      setDescription("");
      onClose?.();
    } catch (error) {
      toast.error(error?.response?.data?.detail || `Error creating report group ${name}`);
      console.log("Error creating report group", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-xl font-semibold text-dark">
            {groupData ? "Edit Report Group" : "Create New Report Group"}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={loading}
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Group Code *
            </label>
            <input
              type="text"
              id="code"
              name="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Enter group code"
              disabled={loading}
            />
          </div>

          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Group Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Enter group name"
              disabled={loading}
            />
          </div>

          <div className="mb-6">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Enter group description"
              disabled={loading}
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-red-500 border border-gray-300 rounded-md text-white hover:bg-gray-400"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-secondary"
              disabled={loading}
            >
              {loading ? (groupData ? "Saving..." : "Creating...") : (groupData ? "Save Changes" : "Create Group")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateReportGroupModal;
