import axios from 'axios';

const api = axios.create({
    baseURL: "https://biblecomment-backend.herokuapp.com:7603"
})

export default api;