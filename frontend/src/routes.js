import { BrowserRouter, Route, Switch } from "react-router-dom";

import Chapter from "./pages/Chapter";
import Control from "./pages/Control";
import Discussion from "./pages/Discussion";
import Help from "./pages/Help";
import Main from "./pages/Main";
import React from "react";

export default function Routes() {
	return (
		<BrowserRouter>
			<Switch>
				<Route path="/" exact render={Main} />
				<Route exact path="/verses/:abbrev/:number/" component={Chapter} />
				<Route exact path="/discussion/:abbrev" component={Discussion} />
				<Route exact path="/admin" component={Control} />
				<Route exact path="/help" render={Help} />
			</Switch>
		</BrowserRouter>
	);
}
