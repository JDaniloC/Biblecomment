import axios from "services/api";

export const chapterAPI = {
	getBook: async (abbrev) => {
		try {
			const response = await axios.get(`/books/${abbrev}/`);
			return { data: response.data };
		} catch (error) {
			if (error.response) {
				return { error: error.response.data.error };
			}
			return { error: `Problema no servidor: ${error.toString()}` };
		}
	},

	getChapterVerses: async (abbrev, chapter) => {
		try {
			const response = await axios.get(`/books/${abbrev}/verses/${chapter}/`);
			return { data: response.data };
		} catch (error) {
			if (error.response) {
				return { error: error.response.data.error };
			}
			return { error: `Problema no servidor: ${error.toString()}` };
		}
	},

	getChapterComments: async (abbrev, chapter) => {
		try {
			const response = await axios.get(`/comments/${abbrev}/${chapter}/`);
			return { data: response.data };
		} catch (error) {
			if (error.response) {
				return { error: error.response.data.error };
			}
			return { error: `Problema no servidor: ${error.toString()}` };
		}
	},
};
