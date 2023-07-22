import React from "react";
import styles from "./Modal.module.scss";

export default function Modal({ show, children, onHandleClose }) {
	const showClassName = show ? styles.showModal : styles.hideModal;

	return (
		<div className={`${styles.modal} ${showClassName}`}>
			<section className={styles.modalMain}>{children}</section>
			<div className={styles.overlay} onClick={onHandleClose} role="button" />
		</div>
	);
}
