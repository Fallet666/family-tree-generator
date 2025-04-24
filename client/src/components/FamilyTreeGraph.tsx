import React, { useEffect, useRef } from "react";
import cytoscape from "cytoscape";
import { FamilyTree } from "../types/FamilyTree";

interface Props {
  treeData: FamilyTree;
}

const FamilyTreeGraph: React.FC<Props> = ({ treeData }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const nodes = treeData.persons.map((person) => ({
      data: {
        id: person.id,
        label: person.fullName + "\n" + person.birthDate
      },
      style: person.photoUrl
        ? {
            "background-image": person.photoUrl,
            "background-fit": "cover",
            "background-opacity": 1
          }
        : {}
    }));

    const edges = treeData.relations.map((rel) => ({
      data: {
        source: rel.from,
        target: rel.to,
        label: rel.type === "spouse" ? "Муж/Жена" : "Родитель"
      },
      classes: rel.type
    }));

        // @ts-ignore
    // @ts-ignore
    const cy = cytoscape({

      container: containerRef.current,
      elements: [...nodes, ...edges],
      layout: { name: "breadthfirst", directed: true, padding: 10 },
      style: [
        {
          selector: "node",
          style: {
            "background-color": "#fff", "border-width": 2, "border-color": "#007bff",
            label: "data(label)",
            color: "#000",
            "text-valign": "center", "shape": "roundrectangle",
            "text-halign": "center",
            "font-size": "10px",
            "width": "120",
            "height": "70"
          }
        },
        {
          selector: "edge",
          style: {
            "line-color": "#ccc",
            "target-arrow-color": "#ccc",
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
            label: "data(label)",
            "font-size": "8px",
            "text-margin-y": -10
          }
        }
      ]
        });

    cy.on("tap", "node", (evt) => {
      const node = evt.target;
      const name = node.data("label").split("\n")[0];
      const confirmDelete = window.confirm(`Удалить узел "${name}"?`);
      if (confirmDelete) {
        const idToRemove = node.id();
        const updatedPersons = treeData.persons.filter(p => p.id !== idToRemove);
        const updatedRelations = treeData.relations.filter(r => r.from !== idToRemove && r.to !== idToRemove);
        const event = new CustomEvent("tree:update", {
          detail: { persons: updatedPersons, relations: updatedRelations }
        });
        window.dispatchEvent(event);
      }
    });

    cy.on("tap", "edge", (evt) => {
      const edge = evt.target;
      const confirmDelete = window.confirm(`Удалить связь: ${edge.data("label")}?`);
      if (confirmDelete) {
        const from = edge.source().id();
        const to = edge.target().id();
        const updatedRelations = treeData.relations.filter(r => !(r.from === from && r.to === to));
        const event = new CustomEvent("tree:update", {
          detail: { persons: treeData.persons, relations: updatedRelations }
        });
        window.dispatchEvent(event);
      }
    });

  }, [treeData]);

  return <div ref={containerRef} style={{ width: "100%", height: "600px" }} />;
};

export default FamilyTreeGraph;
