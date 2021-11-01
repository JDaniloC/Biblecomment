import PropTypes from "prop-types";

export default PropTypes.shape({
	tags: PropTypes.oneOfType([
		PropTypes.string,
		PropTypes.arrayOf(PropTypes.string),
	]).isRequired,
	verse: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
	id: PropTypes.number.isRequired,
	text: PropTypes.string.isRequired,
	likes: PropTypes.string.isRequired,
	on_title: PropTypes.number.isRequired,
	username: PropTypes.string.isRequired,
	created_at: PropTypes.string.isRequired,
	book_reference: PropTypes.string.isRequired,
});
