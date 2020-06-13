import React from 'react';
import { BrowserRouter, Switch, Route } from 'react-router-dom';

import Login from './pages/Login'
import Chapter from './pages/Chapter';

export default function Routes() {
    return (
        <BrowserRouter>
            <Switch>
                <Route path="/" component={Login} exact/>
                <Route path="/chapters" component={Chapter}/>
            </Switch>
        </BrowserRouter>
    )
}