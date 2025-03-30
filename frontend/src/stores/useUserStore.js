import toast from "react-hot-toast";
import { create } from "zustand";
import axios from "../lib/axios";

export const useUserStore = create((set, get) => ({
    user:null,
    loading: false,
    checkingAuth: true,

    signup: async ({ name, email, password, confirmPassword }) => {
		set({ loading: true });

		if (password !== confirmPassword) {
			set({ loading: false });
			return toast.error("Passwords do not match");
		}

		try {
			const res = await axios.post("/auth/signup", { name, email, password });
			set({ user: res?.data, loading: false });
			toast.success("Signup successful");
		} 
        catch (error) {
			set({ loading: false });
			toast.error(error.response.data.message || "An error occurred");
		}
	},

    login: async (email, password ) => {
		set({loading: true });

		try{
			const res = await axios.post("/auth/login", { email, password });
            set({ user: res?.data, loading: false });
			toast.success("Login successful");
		}
		catch(error){
            set({ loading: false });
            toast.error(error.response.data.message || "An error occurred");
        }
	},

	logout : async() => {
		set({loading: true });

		try{
			await axios.post("/auth/logout");
            set({ user: null, loading: false });
			toast.success("Logout successful");
		}
		catch(error){
            set({ loading: false });
            toast.error(error.response.data.message || "An error occurred");
        }
	},

	// Function to check if user is logged in
	checkAuth : async () => {
		set({checkingAuth: true});
		try{
			const res = await axios.get("/auth/profile");
			set({ user: res?.data, checkingAuth: false });
		} 
		catch(error){
            set({ checkingAuth: false, user: null });
        }
	},

	refreshToken: async () => {
		if(get().checkingAuth)	return;

		set({checkingAuth: true});

		try{
            const res = await axios.post("/auth/refresh-token");
            set({ checkingAuth: false });
			return res.data;
        } 
        catch(error){
            set({user:null, checkingAuth: false });
            throw error;
        }
	}
}))

// Axios interceptors for refreshing access tokens
let refreshPromise = null;

axios.interceptors.response.use(
	(response) => response,

	async (error) => {
		const originalRequest = error.config;

		if(error.response?.status === 401 && !originalRequest._retry){
			originalRequest._retry = true;

			try{
				if(refreshPromise){
					await refreshPromise;
					return axios(originalRequest);
				}

				refreshPromise = useUserStore.getState().refreshToken();
				await refreshPromise;
				refreshPromise = null;

				return axios(originalRequest);

			} catch(refreshError){
				useUserStore.getState().logout();
				return Promise.reject(refreshError);
			}
		}
		return Promise.reject(error);
	}
)