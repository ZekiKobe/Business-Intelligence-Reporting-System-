import apiClient from "./apiClient";

// Report Groups
export const createReportGroupApi = (reportGroupData) =>
  apiClient.post("/report-groups/", reportGroupData);
export const getReportGroupsApi = () => apiClient.get("/report-groups/");
export const deleteReportGroupApi = (code) => apiClient.delete(`/report-groups/${code}/`);

// Reports
export const createReportApi = (reportData) => apiClient.post("/reports/", reportData);
export const updateReportApi = (id, reportData) =>
  apiClient.put(`/reports/${id}/`, reportData);
export const getReportsApi = () => apiClient.get("/reports/");
export const getReportByIdApi = (id) => apiClient.get(`/reports/${id}/`);
export const executeSqlApi = (payload) => apiClient.post("/v1/sql/execute", payload);
export const executeReportApi = (reportId, payload) =>
  apiClient.post(`/v1/reports/${reportId}/execute`, payload);
