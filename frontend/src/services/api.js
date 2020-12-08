import axios from 'axios';

const api = axios.create({
    baseURL: "http://34.69.19.239:3333/"
})

export default api;