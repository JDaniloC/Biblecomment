import axios from 'axios';

const api = axios.create({
    baseURL: "http://34.122.74.109:3333/"
})

export default api;