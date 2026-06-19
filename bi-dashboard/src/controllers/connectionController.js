import {
  createConnectionApi,
  deleteConnectionApi,
  getConnectionSchemaApi,
  listConnectionsApi,
  testConnectionApi,
  updateConnectionApi,
  executeSqlApi,
} from "../services/connectionsApi";

export const fetchConnections = async () => {
  const res = await listConnectionsApi();
  return res.data || [];
};

export const createConnection = async (payload) => {
  const res = await createConnectionApi(payload);
  return res.data;
};

export const updateConnection = async (publicId, payload) => {
  const res = await updateConnectionApi(publicId, payload);
  return res.data;
};

export const deleteConnection = async (publicId) => {
  const res = await deleteConnectionApi(publicId);
  return res.data;
};

export const testConnection = async (publicId) => {
  const res = await testConnectionApi(publicId);
  return res.data;
};

export const fetchConnectionSchema = async (publicId) => {
  const res = await getConnectionSchemaApi(publicId);
  return res.data?.tables || [];
};

export const executeConnectionSql = async (payload) => {
  const res = await executeSqlApi(payload);
  return res.data;
};

