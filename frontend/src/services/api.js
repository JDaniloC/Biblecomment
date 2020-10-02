import axios from 'axios';

const api = axios.create({
    baseURL: "https://3333-f495e8bb-6dc0-460d-a023-78e65da57ff3.ws-us02.gitpod.io/"
})

export default api;