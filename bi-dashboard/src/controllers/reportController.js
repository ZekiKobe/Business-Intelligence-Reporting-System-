import {
  createReportGroupApi,
  deleteReportGroupApi,
  getReportGroupsApi,
  createReportApi,
  updateReportApi,
  getReportByIdApi,
  getReportsApi,
  executeSqlApi,
} from "../services/reportsApi";

// Create Report group
export const createReportGroup = async (reportGroupData) => {
  try {
    const res = await createReportGroupApi(reportGroupData);

    return res.data;
  } catch (error) {
    console.log("Error creating report group", error);
    throw error;
  }
};

export const fetchReportGroups = async () => {
  try {
    const res = await getReportGroupsApi();
    const groups = res.data || [];
    return groups.map((group, index) => ({
      code: group.code || index,
      name: group.group_name,
      group_name: group.group_name,
      description: group.description || "No description",
      count: group.reports ? group.reports.length : 0,
    }));
  } catch (error) {
    throw error;
  }
};

// Create report
export const createReport = async (reportData) => {
  try {
    const res = await createReportApi(reportData);

    return res.data;
  } catch (error) {
    console.log("error creating report", error);
    throw error;
  }
};
// Update report
export const updateReport = async (reportId, reportData) => {
  try {
    const res = await updateReportApi(reportId, reportData);

    return res.data;
  } catch (error) {
    console.log("Error updating report", error);
    throw error;
  }
};

export const deleteReportGroup = async (code) => {
  try {
    const res = await deleteReportGroupApi(code);
    return res.data;
  } catch (error) {
    throw error;
  }
};

// Get report by report id
export const getReportById = async (id) => {
  try {
    const res = await getReportByIdApi(id);

    return res.data;
  } catch (error) {
    console.log("Error fetching a report");
    throw error;
  }
};

// Fetching all reports
export const getAllReports = async () => {
  try {
    const res = await getReportsApi();

    return res.data;
  } catch (error) {
    console.log("Error fetching reports");
  }
};

export const executeReportSql = async (payload) => {
  const res = await executeSqlApi(payload);
  return res.data;
};
