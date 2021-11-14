import PropTypes from "prop-types";

export default PropTypes.shape({
	title: PropTypes.string.isRequired,
	abbrev: PropTypes.string.isRequired,
	length: PropTypes.number.isRequired,
});
