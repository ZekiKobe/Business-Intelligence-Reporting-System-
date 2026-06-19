import { createUserApi, getMeApi, getUsersApi } from "../services/userApi";

export const createUser =  async(userData) => {
    try {
        const res = await createUserApi(userData);

        return res.data;
    } catch (error) {
        console.log('Error creating user', error);
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