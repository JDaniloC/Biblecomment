import PropTypes from "prop-types";

export default PropTypes.shape({
	id: PropTypes.number.isRequired,
	text: PropTypes.string.isRequired,
	likes: PropTypes.string.isRequired,
	verse: PropTypes.string.isRequired,
	on_title: PropTypes.bool.isRequired,
	username: PropTypes.string.isRequired,
	created_at: PropTypes.string.isRequired,
	book_reference: PropTypes.string.isRequired,
	tags: PropTypes.arrayOf(PropTypes.string).isRequired,
});
