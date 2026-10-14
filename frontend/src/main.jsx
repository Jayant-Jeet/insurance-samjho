import React from "react";
import ReactDOM from "react-dom/client";
import { ApolloClient, InMemoryCache, HttpLink } from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import App from "./App.jsx";
import { LanguageProvider } from "./LanguageContext.jsx";
import { API_BASE_URL } from "./config.js";
import "./index.css";

const client = new ApolloClient({
  link: new HttpLink({ uri: `${API_BASE_URL}/graphql` }),
  cache: new InMemoryCache(),
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ApolloProvider client={client}>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </ApolloProvider>
  </React.StrictMode>
);
