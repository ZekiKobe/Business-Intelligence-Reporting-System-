import apiClient from "./apiClient";

export const getReportGroupAccessApi = () => apiClient.get("/report-group-access/");
export const putReportGroupAccessApi = (body) => apiClient.put("/report-group-access/", body);
