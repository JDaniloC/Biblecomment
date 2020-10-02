import React, { Component } from 'react';
import ReactLoading from "react-loading";

import "./styles.css"

class Loading extends Component {
    render() {return (
        <div className = "loading">
            <ReactLoading type="spokes" color="black" />
        </div>
    )}
}

export {Loading};