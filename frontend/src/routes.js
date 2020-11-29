import React from 'react';
import { BrowserRouter, Switch, Route } from 'react-router-dom';

import Main from './pages/Main'
import Chapter from './pages/Chapter';
import Discussion from './pages/Discussion';
import Control from './pages/Control';
import Help from './pages/Help';

export default function Routes() {
    return (
        <BrowserRouter>
            <Switch>
                <Route path="/" exact
                    component={Main}/>
                <Route 
                    exact
                    path="/verses/:abbrev/:number/" 
                    component={Chapter}/>
                <Route 
                    exact 
                    path="/discussion/:abbrev" 
                    component = {Discussion}/>
                <Route 
                    exact path="/admin"
                    component = {Control}/>
                <Route 
                    exact path="/help"
                    component = {Help}/>
            </Switch>
        </BrowserRouter>
    )
}