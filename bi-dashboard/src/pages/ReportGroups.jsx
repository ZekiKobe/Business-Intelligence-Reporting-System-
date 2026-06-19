import { useState, useEffect } from "react";
import { Edit, Trash2, Plus, X, AlertTriangle } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import CreateReportGroupModal from "../components/CreateReportGroupModal";
import { fetchReportGroups, deleteReportGroup } from "../controllers/reportController";
import BiPageHeader from "../components/BiPageHeader";
import PageLoadingSpinner from "../components/PageLoadingSpinner";

const ReportGroups = () => {
  const [reportGroups, setReportGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editGroupData, setEditGroupData] = useState(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    const loadGroups = async () => {
      try {
        const formattedGroups = await fetchReportGroups();
        setReportGroups(formattedGroups);
      } catch (error) {
        console.error("Error fetching report groups:", error);
      } finally {
        setLoading(false);
      }
    };

    loadGroups();
  }, []);

  const handleSave = (savedGroup) => {
    if (editGroupData) {
      setReportGroups((prev) =>
        prev.map((g) => (g.code === savedGroup.code ? savedGroup : g))
      );
      toast.success("Group updated successfully!");
    } else {
      setReportGroups((prev) => [...prev, savedGroup]);
      toast.success("Group created successfully!");
    }
  };

  const handleEdit = (code) => {
    const group = reportGroups.find((g) => g.code === code);
    setEditGroupData(group);
    setIsEditModalOpen(true);
  };

  const confirmDelete = (group) => {
    setDeleteTarget(group);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      await deleteReportGroup(deleteTarget.code);
      setReportGroups(reportGroups.filter((g) => g.code !== deleteTarget.code));
      toast.success("Group deleted successfully!");
    } catch (error) {
      console.error("Error deleting group:", error);
      toast.error("Failed to delete group.");
    } finally {
      setIsDeleteModalOpen(false);
      setDeleteTarget(null);
    }
  };

  if (loading) {
    return <PageLoadingSpinner minHeight="min-h-screen" label="Loading report groups…" />;
  }

  return (
    <div className="ui-shell max-w-[1400px] mx-auto pb-10">
      <Toaster position="top-right" />

      <div className="mb-8">
        <BiPageHeader
          eyebrow="Content architecture"
          title="Report groups"
          description="Curate collections that appear in navigation and control how analysts browse the catalog."
          badges={reportGroups.length ? [{ label: `${reportGroups.length} group${reportGroups.length === 1 ? "" : "s"}` }] : []}
          accent="violet"
          actions={
            <button
              type="button"
              onClick={() => {
                setIsCreateModalOpen(true);
                setEditGroupData(null);
              }}
              className="ui-btn-primary"
            >
              <Plus size={18} /> New group
            </button>
          }
        />
      </div>

      {reportGroups.length === 0 ? (
        <div
          className="surface-card text-center py-14 px-4"
          style={{ borderStyle: "dashed" }}
        >
          <p className="font-display font-semibold mb-1" style={{ color: "var(--surface-text)" }}>
            No groups yet
          </p>
          <p className="opacity-60 text-sm max-w-md mx-auto">
            Create a group to classify reports for the portal and dashboard navigation.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {reportGroups.map((group) => (
            <div
              key={group.code}
              className="surface-card p-5 sm:p-6 relative"
            >
              <div className="absolute top-4 right-4 flex gap-1">
                <button
                  type="button"
                  className="ui-btn-ghost p-2 rounded-lg opacity-70 hover:opacity-100"
                  title="Edit"
                  onClick={() => handleEdit(group.code)}
                >
                  <Edit size={16} />
                </button>
                <button
                  type="button"
                  className="ui-btn-ghost p-2 rounded-lg text-red-600 hover:bg-red-50"
                  title="Delete"
                  onClick={() => confirmDelete(group)}
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <h3 className="font-display text-lg font-bold mb-2 pr-20 truncate" style={{ color: "var(--surface-text)" }}>
                {group.name}
              </h3>
              <p className="text-sm opacity-70 mb-4 line-clamp-2 leading-relaxed">{group.description}</p>
              <span
                className="text-xs font-semibold uppercase tracking-wide px-2.5 py-1 rounded-lg inline-block"
                style={{ background: "var(--brand-primary-soft)", color: "var(--brand-primary)" }}
              >
                {group.count} {group.count === 1 ? "report" : "reports"}
              </span>
            </div>
          ))}
        </div>
      )}

      <CreateReportGroupModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleSave}
      />

      <CreateReportGroupModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSave}
        groupData={editGroupData}
      />

      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 w-full max-w-sm relative">
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>

            <div className="flex flex-col items-center text-center">
              <AlertTriangle className="text-red-500 w-10 h-10 sm:w-12 sm:h-12 mb-3" />
              <h2 className="text-lg sm:text-xl font-bold mb-2">Delete Group?</h2>
              <p className="text-gray-600 text-sm mb-4">
                Are you sure you want to delete{" "}
                <span className="font-semibold">{deleteTarget?.name}</span>?  
                This action cannot be undone.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 w-full"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 w-full"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportGroups;