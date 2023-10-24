import React from "react";
import PropTypes from "prop-types";
import Styles from "./comment-count.module.scss";

export default function CommentCount({ commentsCount, currentIndex }) {
  const amount = commentsCount[currentIndex];

  const color =
    amount === 0
      ? ""
      : amount < 2
      ? "lighter"
      : amount < 3
      ? "light"
      : amount < 5
      ? "normal"
      : amount < 10
      ? "dark"
      : "darker";

  return (
    <div className={Styles.commentCount} data-color={color}>
      {amount}
    </div>
  );
}
CommentCount.propTypes = {
  commentsCount: PropTypes.arrayOf(PropTypes.number),
  currentIndex: PropTypes.number,
};
