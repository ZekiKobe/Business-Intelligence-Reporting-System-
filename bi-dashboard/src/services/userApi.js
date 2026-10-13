import apiClient from "./apiClient";

export const createUserApi = (userData) => apiClient.post("/user", userData);
export const getUsersApi = () => apiClient.get("/user");
export const deleteUserApi = (userId) => apiClient.delete(`/user/${userId}/`);
export const getMeApi = () => apiClient.get("/user/me/");
