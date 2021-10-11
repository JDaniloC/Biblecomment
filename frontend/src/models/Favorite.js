import PropTypes from "prop-types";

export default PropTypes.shape({
    text: PropTypes.string.isRequired,
    username: PropTypes.string.isRequired,
    book_reference: PropTypes.string.isRequired
})