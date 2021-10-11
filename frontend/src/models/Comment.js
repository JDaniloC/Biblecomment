import PropTypes from "prop-types";

export default PropTypes.shape({
	id: PropTypes.number.isRequired,
	text: PropTypes.string.isRequired,
	likes: PropTypes.string.isRequired,
	book_reference: PropTypes.string.isRequired,
});
