import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import TreeApp from "./TreeApp";
import HomePage from "./pages/HomePage";

export default function App() {
  return (
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/tree" element={<TreeApp />} />
        </Routes>
      </Router>
  );
}
