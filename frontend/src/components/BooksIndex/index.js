import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import axios from '../../services/api';
import { Loading } from '../Partials'

import "./styles.css"

const close = require("../../assets/x.svg")

export default class BooksIndex extends Component {
    constructor(props) {
        super(props);

        this.state = {
            books: [],
            numbers: [],
            selected: {"abbrev": "", "max": 0},
            blur: "none",
            chapters: "invisible",
        }
    }
    
    componentDidMount() {
        try {
            axios.get("books").then(response => {
                if (typeof(response.data) === 'object') {
                    this.setState({ books: response.data })
                }
            })
        } catch (err) {
            console.log("Problema no servidor")
        }
        
        let number_list = [];
        for (let i = 1; i <= 150; i++) {
            number_list.push(i)
        }
        this.setState({ numbers: number_list })
    }

    showChapterNumbers(abbrev, max) {
        this.setState({ selected: {
            "abbrev": abbrev,
            "max": max
        } })

        this.setState({ chapters: "visible centro" })
        this.setState({ blur: "block" })
    }

    closeChapters() {
        this.setState({ chapters: "invisible" })
        this.setState({ blur: "none" })
    }

    changePage(evt, chapter, number) {
        evt.preventDefault();

        if (this.props.changeChapter !== undefined) {
            this.props.changeChapter(chapter, number)
            this.closeChapters();
        }
    }

    render() { 
        return (
            <div className = "books-container">
                <h2> Escolha a meditação de hoje </h2>
                <ul className="books">
                    {(this.state.books.length > 0) ? this.state.books.map(book => (
                        <li 
                            key = {book.abbrev}
                            onClick = {
                                () => this.showChapterNumbers(
                                    book.abbrev, book.length)
                            }>
                            {book.title}
                        </li>
                    )) : <Loading />}
                </ul>
                <div className={this.state.chapters}>
                    <div className="chapters-container">
                        <div className="top" style = {{ justifyContent: "space-between" }}>
                            <h2 style = {{ alignSelf: "center" }}> 
                                Escolha o capítulo 
                            </h2>
                            <button 
                                onClick={
                                    () => this.closeChapters()}>
                                <img src={close} alt="Fechar"/>
                            </button>
                        </div>

                        <ul>
                            {this.state.numbers.slice(
                                0, this.state.selected.max
                            ).map( chapter => (
                                <Link 
                                    key = {chapter}
                                    to = {`/verses/${this.state.selected.abbrev}/${chapter}`}
                                    onMouseDown = {(evt) => {this.changePage(
                                        evt, this.state.selected.abbrev, chapter)}
                                }>
                                    {chapter}
                                </Link>
                            ))}
                        </ul>
                    </div>
                </div>
                <div className="overlay" style={
                    { display: this.state.blur }
                }></div>
            </div>
    )}
}