import { adminLoginApi } from '../services/authApi';

export const adminLogin = async (credentials) => {
    try {
        const res = await adminLoginApi(credentials);
        
        return res.data;
    } catch (error) {
        console.log("error logging in", error);
        throw error.response?.data || error;
    }
};