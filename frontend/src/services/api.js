import axios from "axios";

const api = axios.create({
	baseURL: "https://biblecomment.herokuapp.com/",
});

export default api;
