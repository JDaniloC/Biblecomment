import React from 'react';
import { BrowserRouter, Switch, Route } from 'react-router-dom';

import Main from './pages/Main'
import Chapter from './pages/Chapter';
import Discussion from './pages/Discussion';
import Control from './pages/Control';

export default function Routes() {
    return (
        <BrowserRouter>
            <Switch>
                <Route path="/" component={Main} exact/>
                <Route 
                    exact
                    path="/verses/:abbrev/:number/" 
                    component={Chapter}/>
                <Route 
                    exact 
                    path="/discussion/:abbrev" 
                    component = {Discussion}/>
                <Route 
                    exact 
                    path="/admin"
                    component = {Control}/>
            </Switch>
        </BrowserRouter>
    )
}