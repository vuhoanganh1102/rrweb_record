import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import styled from "styled-components";
import Home from "./pages/Home";
import Sessions from "./pages/Sessions";
import Replay from "./pages/Replay";

const AppContainer = styled.div`
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
`;

const Navbar = styled.nav`
  background-color: #333;
  color: white;
  padding: 1rem;
`;

const NavList = styled.ul`
  display: flex;
  list-style: none;
  margin: 0;
  padding: 0;
`;

const NavItem = styled.li`
  margin-right: 1rem;
`;

const NavLink = styled(Link)`
  color: white;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`;

function App() {
  return (
    <Router>
      <AppContainer>
        <Navbar>
          <NavList>
            <NavItem>
              <NavLink to="/">Home</NavLink>
            </NavItem>
            <NavItem>
              <NavLink to="/sessions">Sessions</NavLink>
            </NavItem>
          </NavList>
        </Navbar>

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/sessions" element={<Sessions />} />
          <Route path="/replay/:sessionId" element={<Replay />} />
        </Routes>
      </AppContainer>
    </Router>
  );
}

export default App;
