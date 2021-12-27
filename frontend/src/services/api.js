import axios from "axios";
import { TOKEN_KEY } from "./auth";

const fetchClient = () => {
	const instance = axios.create({
		baseURL: process.env.REACT_APP_BACKEND_URL,
	});

	// Set the AUTH token for any request
	instance.interceptors.request.use(function (config) {
		const token = localStorage.getItem(TOKEN_KEY);
		if (token) {
			config.headers.Authorization = token;
		}
		return config;
	});

	return instance;
};

export default fetchClient();