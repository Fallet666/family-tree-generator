import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import TreeApp from "./TreeApp";
import HomePage from "./pages/HomePage";
import { LogPage } from "./pages/LogPage";

export default function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/tree" element={<TreeApp />} />
                <Route path="/tree/log" element={<LogPage />} />
            </Routes>
        </Router>
    );
}
