import axios from 'axios';

const api = axios.create({
    baseURL: "https://backend.biblecomment.net/"
})

export default api;