import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import FamilyTreeGraph from "./FamilyTreeGraph";
import PersonForm from "./PersonForm";
import "../styles/index.css";
import "../styles/layout.css";
import "../styles/form.css";
import "../styles/person-card.css";
import { FamilyTree } from "../types/FamilyTree";
import { addLogEntry } from "../services/logService";

const initialData: FamilyTree = {
    persons: [
        { id: "1", fullName: "Окак Окакий Евгеньевич", birthDate: "2003-09-01", photoUrl: "" },
        { id: "2", fullName: "Окак Акакия Сергеевна", birthDate: "2003-12-12", photoUrl: "" },
        { id: "3", fullName: "Окак Виталий Окакиевич", birthDate: "2022-01-01", photoUrl: "" }
    ],
    relations: [
        { from: "1", to: "2", type: "spouse" },
        { from: "1", to: "3", type: "parent" },
        { from: "2", to: "3", type: "parent" }
    ]
};

const App: React.FC = () => {
    const navigate = useNavigate();
    const sidebarRef = useRef<HTMLDivElement>(null);

    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [treeData, setTreeData] = useState<FamilyTree>(() => {
        const saved = localStorage.getItem("saved_tree");
        return saved ? JSON.parse(saved) : initialData;
    });
    const [showLabels, setShowLabels] = useState<boolean>(() => {
        const saved = localStorage.getItem("show_labels");
        return saved ? JSON.parse(saved) : true;
    });
    const [showBirthDates, setShowBirthDates] = useState<boolean>(() => {
        const saved = localStorage.getItem("show_birth_dates");
        return saved ? JSON.parse(saved) : true;
    });

    const [currentUser, setCurrentUser] = useState<string>(() => localStorage.getItem("current_user") || "");
    const [nameInput, setNameInput] = useState("");
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
        setToggleLeft(sidebarOpen ? `${sidebarWidth + 10}px` : "1rem");
    }, [sidebarOpen]);

    useEffect(() => {
        localStorage.setItem("saved_tree", JSON.stringify(treeData));
    }, [treeData]);

    useEffect(() => {
        localStorage.setItem("show_labels", JSON.stringify(showLabels));
    }, [showLabels]);

    useEffect(() => {
        localStorage.setItem("show_birth_dates", JSON.stringify(showBirthDates));
    }, [showBirthDates]);

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
                addLogEntry(`📥 ${currentUser} импортировал дерево`);
            } catch (err) {
                alert("Ошибка при импорте файла.");
            }
        };
        reader.readAsText(file);
    };

    const handleExport = () => {
        const blob = new Blob([JSON.stringify(treeData, null, 2)], {
            type: "application/json"
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "family-tree.json";
        a.click();
        URL.revokeObjectURL(url);
        addLogEntry(`📤 ${currentUser} экспортировал дерево`);
    };

    const handleDeleteTree = () => {
        setTreeData({ persons: [], relations: [] });
        localStorage.removeItem("saved_tree");
        addLogEntry(`🗑 ${currentUser} удалил всё семейное дерево`);
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
                            <h2 className="sidebar__title">Семейное древо</h2>
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
                            <label className="checkbox">
                                <input
                                    type="checkbox"
                                    checked={showBirthDates}
                                    onChange={() => setShowBirthDates(prev => !prev)}
                                />
                                <span className="checkbox__text">Отобразить даты рождения</span>
                            </label>
                        </div>

                        <div className="sidebar__section">
                            <PersonForm treeData={treeData} onUpdateTree={handleAddPerson} currentUser={currentUser} />
                        </div>

                        <div className="sidebar__section">
                            <button className="btn" onClick={() => navigate("/tree/log")}>
                                🧾 История изменений
                            </button>
                        </div>
                        <div className="sidebar__section">
                            <button className="btn" onClick={handleDeleteTree}>
                                🗑 Удалить граф
                            </button>
                        </div>
                    </div>
                )}

                <div className={`main-content ${!sidebarOpen ? "main-content--expanded" : ""}`}>
                    <FamilyTreeGraph treeData={treeData} showLabels={showLabels} showBirthDates={showBirthDates} />
                </div>
            </div>

            <footer className="app-footer">
                <p>© 2025 Алексей Коротков. Сделано с душой.</p>
            </footer>

            {!currentUser && (
                <div className="modal-screen">
                    <div className="modal">
                        <h2>Введите ваше имя</h2>
                        <input
                            type="text"
                            placeholder="Ваше имя"
                            value={nameInput}
                            onChange={(e) => setNameInput(e.target.value)}
                        />
                        <button
                            onClick={() => {
                                if (nameInput.trim()) {
                                    localStorage.setItem("current_user", nameInput.trim());
                                    setCurrentUser(nameInput.trim());
                                }
                            }}
                        >
                            Начать
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default App;
