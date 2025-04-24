import React, { useState } from "react";
import { FamilyTree } from "../types/FamilyTree";

interface Props {
  treeData: FamilyTree;
  onUpdateTree: (updated: FamilyTree) => void;
}

const PersonForm: React.FC<Props> = ({ treeData, onUpdateTree }) => {
  const [fullName, setFullName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [linkType, setLinkType] = useState<"parent" | "child" | "spouse">("parent");
  const [targetId, setTargetId] = useState("");
  const [linkSecondId, setLinkSecondId] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newId = (treeData.persons.length + 1).toString();
    const newPerson = { id: newId, fullName, birthDate, photoUrl };

    const updatedPersons = [...treeData.persons, newPerson];
    const updatedRelations = targetId
      ? [...treeData.relations, { from: targetId, to: newId, type: linkType }]
      : [...treeData.relations];

    onUpdateTree({ persons: updatedPersons, relations: updatedRelations });

    setFullName("");
    setBirthDate("");
    setPhotoUrl("");
    setTargetId("");
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

      <select value={linkType} onChange={(e) => setLinkType(e.target.value as 'parent' | 'child' | 'spouse')}>
        <option value="parent">Родитель</option>
        <option value="child">Ребёнок</option>
        <option value="spouse">Супруг(а)</option>
      </select>

      <select value={targetId} onChange={(e) => setTargetId(e.target.value)}>
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
        <select value={linkType} onChange={(e) => setLinkType(e.target.value as 'parent' | 'child' | 'spouse')}>
          <option value="parent">Родитель</option>
          <option value="child">Ребёнок</option>
          <option value="spouse">Супруг(а)</option>
        </select>

        <select value={targetId} onChange={(e) => setTargetId(e.target.value)}>
          <option value="">— Кто —</option>
          {treeData.persons.map((p) => (
            <option key={p.id} value={p.id}>
              {p.fullName}
            </option>
          ))}
        </select>

        <select value={linkSecondId} onChange={(e) => setLinkSecondId(e.target.value)}>
          <option value="">— Кому —</option>
          {treeData.persons.map((p) => (
            <option key={p.id} value={p.id}>
              {p.fullName}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => {
            if (!targetId || !linkSecondId || targetId === linkSecondId) return;
            const newRelation = { from: targetId, to: linkSecondId, type: linkType };
            const updatedTree = {
              persons: treeData.persons,
              relations: [...treeData.relations, newRelation]
            };
            onUpdateTree(updatedTree);
            setTargetId("");
            setLinkSecondId("");
          }}
        >
          Создать связь
        </button>
      </div>
    
</form>
  );
};

export default PersonForm;
