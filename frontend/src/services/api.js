import axios from 'axios';

const api = axios.create({
    baseURL: "https://biblecomment.herokuapp.com:3306"
})

export default api;