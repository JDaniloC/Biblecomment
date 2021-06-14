import React, { Component } from 'react'
import ReactLoading from 'react-loading'
import { Link } from 'react-router-dom'

import './styles.css'

class Loading extends Component {
  render () {
    return (
      <div className='loading'>
        <ReactLoading type='spokes' color='black' />
      </div>
    )
  }
}

class HelpButton extends Component {
  render () {
    return (
      <Link to='/help'>
        <span className='help-popup'>
          Precisa de ajuda?
        </span>
      </Link>
    )
  }
}

export { Loading, HelpButton }
