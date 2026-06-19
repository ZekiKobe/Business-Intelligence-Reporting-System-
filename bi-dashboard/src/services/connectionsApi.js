import apiClient from "./apiClient";

export const listConnectionsApi = () => apiClient.get("/v1/connections/");

export const createConnectionApi = (payload) =>
  apiClient.post("/v1/connections/", payload);

export const updateConnectionApi = (publicId, payload) =>
  apiClient.patch(`/v1/connections/${publicId}/`, payload);

export const deleteConnectionApi = (publicId) =>
  apiClient.delete(`/v1/connections/${publicId}/`);

export const testConnectionApi = (publicId) =>
  apiClient.post(`/v1/connections/${publicId}/test/`);

/** Schema introspection can be slow on large Oracle / SQL Server catalogs; allow several minutes. */
export const getConnectionSchemaApi = (publicId) =>
  apiClient.get(`/v1/connections/${publicId}/schema/`, { timeout: 180000 });

export const executeSqlApi = (payload) => apiClient.post("/v1/sql/execute", payload);

