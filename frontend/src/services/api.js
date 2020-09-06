import axios from 'axios';

const api = axios.create({
    baseURL: "https://biblecomment-backend.herokuapp.com"
})

export default api;