import PropTypes from "prop-types";

export default PropTypes.shape({
	id: PropTypes.number.isRequired,
	name: PropTypes.string.isRequired,
	text: PropTypes.string.isRequired,
});
