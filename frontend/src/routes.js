import React from 'react';
import { BrowserRouter, Switch, Route } from 'react-router-dom';

import Main from './pages/Main'
import Chapter from './pages/Chapter';

export default function Routes() {
    return (
        <BrowserRouter>
            <Switch>
                <Route path="/" component={Main} exact/>
                <Route 
                    exact
                    path="/verses/:abbrev/:number/" 
                    component={Chapter}/>
            </Switch>
        </BrowserRouter>
    )
}