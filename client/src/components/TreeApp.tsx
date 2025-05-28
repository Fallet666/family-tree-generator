import React, { useState, useEffect, useRef } from "react";
import FamilyTreeGraph from "./FamilyTreeGraph";
import PersonForm from "./PersonForm";
import "../styles/index.css";
import "../styles/layout.css";
import "../styles/form.css";
import "../styles/person-card.css";
import { FamilyTree } from "../types/FamilyTree";

const initialData: FamilyTree = {
    persons: [
        {
            id: "1",
            fullName: "Окак Окакий Евгеньевич",
            birthDate: "2003-09-01",
            photoUrl: ""
        },
        {
            id: "2",
            fullName: "Окак Акакия Сергеевна",
            birthDate: "2003-12-12",
            photoUrl: ""
        },
        {
            id: "3",
            fullName: "Окак Виталий Окакиевич",
            birthDate: "2022-01-01",
            photoUrl: ""
        }
    ],
    relations: [
        { from: "1", to: "2", type: "spouse" },
        { from: "1", to: "3", type: "parent" },
        { from: "2", to: "3", type: "parent" }
    ]
};

const App: React.FC = () => {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [treeData, setTreeData] = useState<FamilyTree>(initialData);
    const [showLabels, setShowLabels] = useState(true);
    const sidebarRef = useRef<HTMLDivElement>(null);
    const [toggleLeft, setToggleLeft] = useState("1rem");

    useEffect(() => {
        const handler = (e: any) => {
            if (e.detail) setTreeData(e.detail);
        };
        window.addEventListener("tree:update", handler);
        return () => window.removeEventListener("tree:update", handler);
    }, []);

    useEffect(() => {
        const sidebarWidth = sidebarRef.current?.offsetWidth || 0;
        if (sidebarOpen) {
            setToggleLeft(`${sidebarWidth + 10}px`);
        } else {
            setToggleLeft("1rem");
        }
    }, [sidebarOpen]);

    const handleAddPerson = (newTree: FamilyTree) => {
        setTreeData(newTree);
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            const content = reader.result as string;
            try {
                const parsed = JSON.parse(content);
                setTreeData(parsed);
            } catch (err) {
                alert("Ошибка при импорте файла.");
            }
        };
        reader.readAsText(file);
    };

    const handleExport = () => {
        const blob = new Blob([JSON.stringify(treeData, null, 2)], {
            type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "family-tree.json";
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <>
            <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="sidebar__toggle--floating"
                style={{ left: toggleLeft }}
                aria-label="Toggle sidebar"
            >
                {sidebarOpen ? "⇤" : "⇥"}
            </button>

            <div className="container">
                {sidebarOpen && (
                    <div className="sidebar" ref={sidebarRef}>
                        <div className="sidebar__header">
                            <h2  className="sidebar__title">Семейное древо</h2>
                        </div>
                        <div className="sidebar__section">
                            <label className="btn">
                                Импорт
                                <input type="file" accept=".json" onChange={handleImport} hidden />
                            </label>
                            <button className="btn" onClick={handleExport}>Экспорт</button>
                        </div>
                        <div className="sidebar__section">
                            <label className="checkbox">
                                <input
                                    type="checkbox"
                                    checked={showLabels}
                                    onChange={() => setShowLabels(prev => !prev)}
                                />
                                <span className="checkbox__text">Отобразить названия связей</span>
                            </label>
                        </div>
                        <div className="sidebar__section">
                            <PersonForm treeData={treeData} onUpdateTree={handleAddPerson}/>
                        </div>
                    </div>
                )}

                <div className={`main-content ${!sidebarOpen ? "main-content--expanded" : ""}`}>
                    <FamilyTreeGraph treeData={treeData} showLabels={showLabels} />
                </div>
            </div>

            <footer className="app-footer">
                <p>© 2025 Алексей Коротков. Сделано с душой.</p>
            </footer>
        </>
    );
};

export default App;