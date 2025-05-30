import React, { useState } from "react";
import { FamilyTree, RelationType } from "../types/FamilyTree";
import { addLogEntry } from "../services/logService";
import "../styles/form.css";

interface Props {
    treeData: FamilyTree;
    onUpdateTree: (updated: FamilyTree) => void;
    currentUser: string;
}

const PersonForm: React.FC<Props> = ({ treeData, onUpdateTree, currentUser }) => {
    const [fullName, setFullName] = useState("");
    const [birthDate, setBirthDate] = useState("");
    const [photoUrl, setPhotoUrl] = useState("");

    const [addLinkType, setAddLinkType] = useState<"" | "parent" | "child" | "spouse">("");
    const [addTargetId, setAddTargetId] = useState("");

    const [connectLinkType, setConnectLinkType] = useState<"" | "parent" | "child" | "spouse">("");
    const [connectTargetId, setConnectTargetId] = useState("");
    const [connectSecondId, setConnectSecondId] = useState("");

    const relationMap: Record<RelationType, string> = {
        "" : "",
        parent: "родитель",
        child: "ребёнок",
        spouse: "супруг(а)"
    };

    // const sendTreeToServer = async (tree: FamilyTree) => {
    //     await fetch("/tree", {
    //         method: "POST",
    //         headers: { "Content-Type": "application/json" },
    //         body: JSON.stringify(tree)
    //     });
    // };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const newId = (treeData.persons.length + 1).toString();
        const newPerson = { id: newId, fullName, birthDate, photoUrl };
        const updatedPersons = [...treeData.persons, newPerson];

        let newRelation: { from: string; to: string; type: RelationType } | null = null;

        if (addTargetId && addLinkType) {
            if (addLinkType === "parent") {
                newRelation = { from: newId, to: addTargetId, type: "parent" };
            } else if (addLinkType === "child") {
                newRelation = { from: addTargetId, to: newId, type: "parent" };
            } else if (addLinkType === "spouse") {
                newRelation = { from: newId, to: addTargetId, type: "spouse" };
            }
        }

        const updatedRelations = newRelation
            ? [...treeData.relations, newRelation]
            : [...treeData.relations];

        const updatedTree = { persons: updatedPersons, relations: updatedRelations };
        onUpdateTree(updatedTree);
        // await sendTreeToServer(updatedTree);

        if (addTargetId && addLinkType) {
            const relatedPerson = treeData.persons.find(p => p.id === addTargetId);
            const readable = `${currentUser} добавил ${fullName} (род. ${birthDate}) и связал с ${relatedPerson?.fullName || addTargetId} как ${relationMap[addLinkType as RelationType]}`;
            await addLogEntry(readable);
        } else {
            const readable = `${currentUser} добавил ${fullName} (род. ${birthDate})`;
            await addLogEntry(readable);
        }

        setFullName("");
        setBirthDate("");
        setPhotoUrl("");
        setAddTargetId("");
        setAddLinkType("");
    };

    const handleCreateLink = async () => {
        if (!connectTargetId || !connectSecondId || connectTargetId === connectSecondId || !connectLinkType) return;

        let newRelation: { from: string; to: string; type: RelationType } | null = null;

        if (connectLinkType === "parent") {
            newRelation = { from: connectTargetId, to: connectSecondId, type: "parent" };
        } else if (connectLinkType === "child") {
            newRelation = { from: connectSecondId, to: connectTargetId, type: "parent" };
        } else if (connectLinkType === "spouse") {
            newRelation = { from: connectTargetId, to: connectSecondId, type: "spouse" };
        }

        if (!newRelation) return;

        const updatedTree = {
            persons: treeData.persons,
            relations: [...treeData.relations, newRelation]
        };

        onUpdateTree(updatedTree);
        // await sendTreeToServer(updatedTree);

        const personA = treeData.persons.find(p => p.id === connectTargetId);
        const personB = treeData.persons.find(p => p.id === connectSecondId);
        const readable = `${currentUser} создал связь: ${personA?.fullName || connectTargetId} → ${personB?.fullName || connectSecondId} как ${relationMap[connectLinkType as RelationType]}`;
        await addLogEntry(readable);

        setConnectTargetId("");
        setConnectSecondId("");
        setConnectLinkType("");
    };


    return (
        <form className="person-form" onSubmit={handleSubmit}>
            <h2>Добавить человека</h2>
            <input
                type="text"
                placeholder="ФИО"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
            />
            <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                required
            />
            <input
                type="text"
                placeholder="Ссылка на изображение (необязательно)"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
            />

            <select value={addLinkType} onChange={(e) => setAddLinkType(e.target.value as any)}>
                <option value="">— Роль —</option>
                <option value="parent">Родитель</option>
                <option value="child">Ребёнок</option>
                <option value="spouse">Супруг(а)</option>
            </select>

            <select value={addTargetId} onChange={(e) => setAddTargetId(e.target.value)}>
                <option value="">— Без связи —</option>
                {treeData.persons.map((p) => (
                    <option key={p.id} value={p.id}>
                        {p.fullName}
                    </option>
                ))}
            </select>

            <button type="submit">Добавить</button>

            <h2>Добавить связь</h2>
            <div className="link-form">
                <select value={connectLinkType} onChange={(e) => setConnectLinkType(e.target.value as any)}>
                    <option value="">— Роль —</option>
                    <option value="parent">Родитель</option>
                    <option value="child">Ребёнок</option>
                    <option value="spouse">Супруг(а)</option>
                </select>

                <select value={connectTargetId} onChange={(e) => setConnectTargetId(e.target.value)}>
                    <option value="">— Кто —</option>
                    {treeData.persons.map((p) => (
                        <option key={p.id} value={p.id}>
                            {p.fullName}
                        </option>
                    ))}
                </select>

                <select value={connectSecondId} onChange={(e) => setConnectSecondId(e.target.value)}>
                    <option value="">— Кому —</option>
                    {treeData.persons.map((p) => (
                        <option key={p.id} value={p.id}>
                            {p.fullName}
                        </option>
                    ))}
                </select>

                <button type="button" onClick={handleCreateLink}>
                    Создать связь
                </button>
            </div>
        </form>
    );
};

export default PersonForm;
