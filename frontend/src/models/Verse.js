import PropTypes from "prop-types";

export default PropTypes.shape({
	id: PropTypes.number.isRequired,
	text: PropTypes.string.isRequired,
	abbrev: PropTypes.string.isRequired,
	chapter: PropTypes.number.isRequired,
	reference: PropTypes.string.isRequired,
	verse_number: PropTypes.number.isRequired,
});
