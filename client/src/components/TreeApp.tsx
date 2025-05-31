import React, {useState, useEffect, useRef} from "react";
import {useNavigate} from "react-router-dom";
import FamilyTreeGraph from "./FamilyTreeGraph";
import PersonForm from "./PersonForm";
import "../styles/index.css";
import "../styles/layout.css";
import "../styles/form.css";
import "../styles/person-card.css";
import {FamilyTree} from "../types/FamilyTree";
import {addLogEntry} from "../services/logService";

const App: React.FC = () => {
    const API_BASE = '/api/tree';

    const navigate = useNavigate();
    const sidebarRef = useRef<HTMLDivElement>(null);

    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [treeData, setTreeData] = useState<FamilyTree>({persons: [], relations: []});
    const [showLabels, setShowLabels] = useState<boolean>(() => {
        const saved = localStorage.getItem("show_labels");
        return saved ? JSON.parse(saved) : true;
    });
    const [showBirthDates, setShowBirthDates] = useState<boolean>(() => {
        const saved = localStorage.getItem("show_birth_dates");
        return saved ? JSON.parse(saved) : true;
    });


    const [projectId, setProjectId] = useState(() => localStorage.getItem("project_id") || "");
    const [projectIdInput, setProjectIdInput] = useState("");

    const [currentUser, setCurrentUser] = useState<string>(() => localStorage.getItem("current_user") || "");
    const [nameInput, setNameInput] = useState("");
    const [toggleLeft, setToggleLeft] = useState("1rem");

    useEffect(() => {
        if (!projectId || projectId.trim() === "") return;

        console.log("Fetching tree with projectId:", projectId);

        fetch(`${API_BASE}?projectId=${encodeURIComponent(projectId)}`)
            .then(res => {
                if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
                return res.json();
            })
            .then(data => {
                if (data) {
                    setTreeData(data);
                } else {
                    console.log("Пустое дерево, создаём заново");
                    setTreeData({persons: [], relations: []});
                }
            })
            .catch(console.error);
    }, [projectId]);


    useEffect(() => {
        if (!projectId || treeData.persons.length === 0) return;
        console.log("Saving to server:", projectId, treeData);
        fetch(API_BASE, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({projectId, treeData})
        })
            .then(res => {
                if (!res.ok) throw new Error(`Failed to save: ${res.status}`);
                return res.json();
            })
            .then(data => {
                console.log("Saved successfully:", data);
            })
            .catch(err => {
                console.error("Error saving tree:", err);
            });
    }, [treeData, projectId]);

    useEffect(() => {
        const handler = (e: any) => {
            if (e.detail) setTreeData(e.detail);
        };
        window.addEventListener("tree:update", handler);
        return () => window.removeEventListener("tree:update", handler);
    }, [projectId]);

    useEffect(() => {
        const sidebarWidth = sidebarRef.current?.offsetWidth || 0;
        setToggleLeft(sidebarOpen ? `${sidebarWidth + 10}px` : "1rem");
    }, [sidebarOpen]);

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
                addLogEntry(`${currentUser} импортировал дерево`);
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
        addLogEntry(`${currentUser} экспортировал дерево`);
    };

    const handleDeleteTree = () => {
        const confirmed = window.confirm("Вы уверены, что хотите удалить всё семейное древо?");
        if (!confirmed) return;

        setTreeData({persons: [], relations: []});
        localStorage.removeItem("saved_tree");
        addLogEntry(`${currentUser} удалил всё семейное дерево`);
    };

    return (
        <>
            <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="sidebar__toggle--floating"
                style={{left: toggleLeft}}
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
                            <button className="btn" onClick={() => {
                                setCurrentUser("");
                                setProjectId("");
                            }}>
                                Новый проект
                            </button>
                        </div>

                        <div className="sidebar__section">
                            <label className="btn">
                                Импорт
                                <input type="file" accept=".json" onChange={handleImport} hidden/>
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
                            <PersonForm treeData={treeData} onUpdateTree={handleAddPerson} currentUser={currentUser}/>
                        </div>

                        <div className="sidebar__section">
                            <button className="btn" onClick={() => navigate("/tree/log")}>
                                История изменений
                            </button>
                            <button className="btn" onClick={handleDeleteTree}>
                                Удалить граф
                            </button>
                        </div>
                    </div>
                )}

                <div className={`main-content ${!sidebarOpen ? "main-content--expanded" : ""}`}>
                    <FamilyTreeGraph treeData={treeData} showLabels={showLabels} showBirthDates={showBirthDates}/>
                </div>
            </div>

            <footer className="app-footer">
                <p>© 2025 Алексей Коротков. Сделано с душой.</p>
            </footer>

            {!currentUser && (
                <div className="modal-screen" onClick={(e) => {
                    if (e.target === e.currentTarget) {
                        // нажали вне формы
                    }
                }}>
                    <form
                        className="modal"
                        onClick={(e) => e.stopPropagation()}
                        onSubmit={(e) => {
                            e.preventDefault();
                            if (nameInput.trim() && projectIdInput.trim()) {
                                localStorage.setItem("current_user", nameInput.trim());
                                localStorage.setItem("project_id", projectIdInput.trim());
                                setCurrentUser(nameInput.trim());
                                setProjectId(projectIdInput.trim());
                                setTreeData({...treeData});
                            }
                        }}
                    >
                        <h2>Введите имя и идентификатор проекта</h2>
                        <input
                            type="text"
                            placeholder="Ваше имя"
                            value={nameInput}
                            onChange={(e) => setNameInput(e.target.value)}
                            autoFocus
                        />
                        <input
                            type="text"
                            placeholder="projectId"
                            value={projectIdInput}
                            onChange={(e) => setProjectIdInput(e.target.value)}
                        />
                        <button type="submit">Начать</button>
                    </form>
                </div>
            )}
        </>
    );
};

export default App;
