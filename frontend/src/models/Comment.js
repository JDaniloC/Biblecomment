import PropTypes from "prop-types";

export default PropTypes.shape({
	id: PropTypes.number.isRequired,
	text: PropTypes.string.isRequired,
	verse_id: PropTypes.number.isRequired,
	tags: PropTypes.arrayOf(PropTypes.string).isRequired,
	likes: PropTypes.arrayOf(PropTypes.string).isRequired,
	on_title: PropTypes.oneOfType([PropTypes.number, PropTypes.bool]).isRequired,
	username: PropTypes.string.isRequired,
	created_at: PropTypes.string.isRequired,
	book_reference: PropTypes.string.isRequired,
});
