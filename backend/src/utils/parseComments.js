function parseComments(comments) {
	const titleComments = [];
	const verseComments = [];
	for (const comment of comments) {
		comment.tags = JSON.parse(comment.tags);
		comment.likes = JSON.parse(comment.likes);
		comment.reports = JSON.parse(comment.reports);
		if (comment.on_title) {
			titleComments.push(comment);
		} else {
			verseComments.push(comment);
		}
	}
	return { titleComments, verseComments };
}

module.exports = parseComments;
