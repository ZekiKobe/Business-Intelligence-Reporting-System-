import React, { useState, useEffect } from "react";
import { PlusIcon, Cog6ToothIcon } from "@heroicons/react/24/outline";
import { Link } from "react-router-dom";
import { fetchReportGroups, createReport } from "../controllers/reportController";
import { fetchConnections, fetchConnectionSchema } from "../controllers/connectionController";
import { toast } from "react-toastify";
import PageLoadingSpinner from "../components/PageLoadingSpinner";

const ReportManagementSystem = () => {
  const [loading, setLoading] = useState(true);
  const [reportName, setReportName] = useState("");
  const [reportId, setReportId] = useState("");
  const [selectedReportGroup, setSelectedReportGroup] = useState("");
  const [dataset, setDataset] = useState("");
  const [reportGroup, setReportGroup] = useState([]);
  const [connections, setConnections] = useState([]);
  const [selectedConnection, setSelectedConnection] = useState("");
  const [error, setError] = useState(null);
  const [criteria, setCriteria] = useState("");
  const [schemaTables, setSchemaTables] = useState([]);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [schemaError, setSchemaError] = useState("");

  useEffect(() => {
    const loadReportGroups = async () => {
      try {
        setLoading(true);
        const groups = await fetchReportGroups();
        setReportGroup(groups);
      } catch (err) {
        setError("Failed to fetch Report Groups");
        console.log("[create report] groups failed", err);
      } finally {
        setLoading(false);
      }
    };
    loadReportGroups();
  }, []);

  useEffect(() => {
    const loadConnections = async () => {
      try {
        const rows = await fetchConnections();
        setConnections(rows);
      } catch (err) {
        setConnections([]);
        console.log("[create report] connections failed", err);
      }
    };
    loadConnections();
  }, []);

  useEffect(() => {
    if (!selectedConnection) {
      setSchemaTables([]);
      setSchemaLoading(false);
      setSchemaError("");
      return;
    }
    let cancelled = false;
    (async () => {
      setSchemaLoading(true);
      setSchemaError("");
      try {
        const rows = await fetchConnectionSchema(selectedConnection);
        if (!cancelled) {
          setSchemaTables(rows || []);
          console.log("[create report] schema loaded", {
            connection: selectedConnection,
            tableCount: (rows || []).length,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setSchemaTables([]);
          const msg =
            err?.response?.data?.detail || err?.message || "Failed to load schema";
          setSchemaError(String(msg));
          console.log("[create report] schema failed", { err, msg });
        }
      } finally {
        if (!cancelled) setSchemaLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedConnection]);

  const tableNames = (schemaTables || []).map((t) => t.name || t.table_name || "").filter(Boolean);
  const schemaSelectValue = tableNames.includes(dataset) ? dataset : "";

  const handleSaveReport = async (e) => {
    e.preventDefault();
    if (!reportId || !selectedReportGroup || !selectedConnection) {
      toast.warning("Please provide report ID, select report group, and data source");
      return;
    }
    if (!dataset?.trim()) {
      toast.warning("Select or enter a table / view name (dataset)");
      return;
    }

    const reportData = {
      report_id: reportId,
      name: reportName,
      group: selectedReportGroup,
      dataset: dataset.trim(),
      criteria,
      spec: {
        connection_public_id: selectedConnection,
        table: dataset.trim(),
      },
    };

    try {
      await createReport(reportData);
      toast.success(reportName ? `Report "${reportName}" created successfully` : "Report created successfully");

      setReportName("");
      setCriteria("");
      setReportId("");
      setDataset("");
      setSelectedReportGroup("");
      setSelectedConnection("");
      setSchemaTables([]);
      setSchemaError("");
    } catch (err) {
      console.log("[create report] save failed", err);
      toast.error("Failed to save report. Please try again.");
    }
  };

  if (loading) {
    return <PageLoadingSpinner minHeight="min-h-screen" label="Loading…" />;
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-dark">Create Report</h2>
          <p className="text-gray-600 mt-1 text-sm">Create and configure reports</p>
        </div>
        <Link to="/settings">
          <button className="flex items-center text-sm text-gray-500 hover:text-gray-700 w-full sm:w-auto justify-center sm:justify-start">
            <Cog6ToothIcon className="h-5 w-5 mr-1" /> Settings
          </button>
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 sm:p-6">
        <div className="mb-6 sm:mb-8">
          <h3 className="text-lg font-semibold text-dark">Create New Report</h3>
          <p className="text-gray-600 mt-1 text-sm">Fill in the details to create a new report</p>
        </div>

        <form onSubmit={handleSaveReport} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Report name</label>
            <input
              type="text"
              placeholder="Enter report title"
              value={reportName}
              onChange={(e) => setReportName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Report ID</label>
            <input
              type="text"
              placeholder="Enter report Id"
              value={reportId}
              onChange={(e) => setReportId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Report Group</label>
            <select
              value={selectedReportGroup}
              onChange={(e) => setSelectedReportGroup(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">Select a report group</option>
              {loading ? (
                <option disabled>Loading...</option>
              ) : (
                reportGroup.map((group) => (
                  <option key={group.code} value={group.code}>
                    {group.group_name}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Data Source</label>
            <select
              value={selectedConnection}
              onChange={(e) => {
                setSelectedConnection(e.target.value);
                setDataset("");
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              required
            >
              <option value="">Select a data source connection</option>
              {connections.map((conn) => (
                <option key={conn.public_id} value={conn.public_id}>
                  {conn.name} ({conn.kind})
                </option>
              ))}
            </select>
            {connections.length === 0 ? (
              <p className="text-xs text-red-500 mt-1">
                No data source found. Please create one in Data Sources first.
              </p>
            ) : null}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Table / view (from schema)
            </label>
            <select
              value={schemaSelectValue}
              onChange={(e) => setDataset(e.target.value)}
              disabled={!selectedConnection || schemaLoading}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm mb-2"
            >
              <option value="">
                {!selectedConnection
                  ? "Select a data source first"
                  : schemaLoading
                    ? "Loading tables…"
                    : `Pick a table (${tableNames.length} found)`}
              </option>
              {tableNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Or type table / view name manually
            </label>
            <input
              type="text"
              placeholder="e.g. SCHEMA.TABLE or MYVIEW"
              value={dataset}
              onChange={(e) => setDataset(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            {schemaError ? (
              <p className="text-xs text-amber-700 mt-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1">
                Schema could not be loaded (you can still type a name above): {schemaError}
              </p>
            ) : null}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Criteria:</label>
            <input
              type="text"
              placeholder="Enter criteria..."
              value={criteria}
              onChange={(e) => setCriteria(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          {error ? <p className="md:col-span-2 text-sm text-red-600">{error}</p> : null}

          <div className="flex sm:flex-row justify-end gap-3 md:col-span-2 mt-4">
            <button
              type="button"
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 text-sm sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center justify-center text-sm sm:w-auto"
            >
              <PlusIcon className="h-4 w-4 mr-2" /> Save Report
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReportManagementSystem;
