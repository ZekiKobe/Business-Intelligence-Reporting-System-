import { createUserApi, deleteUserApi, getMeApi, getUsersApi, updateUserApi } from "../services/userApi";

export const createUser = async (userData) => {
  try {
    const res = await createUserApi(userData);
    return res.data;
  } catch (error) {
    console.log("Error creating user", error);
    throw error;
  }
};

export const updateUser = async (userId, userData) => {
  try {
    const res = await updateUserApi(userId, userData);
    return res.data;
  } catch (error) {
    console.log("Error updating user", error);
    throw error;
  }
};

export const getUsers = async () => {
  try {
    const res = await getUsersApi();
    return res.data || [];
  } catch (error) {
    console.log("Error fetching users", error);
    throw error;
  }
};

export const getMe = async () => {
  try {
    const res = await getMeApi();
    return res.data || null;
  } catch (error) {
    console.log("Error fetching current user", error);
    throw error;
  }
};

export const deleteUser = async (userId) => {
  try {
    await deleteUserApi(userId);
  } catch (error) {
    console.log("Error deleting user", error);
    throw error;
  }
};
