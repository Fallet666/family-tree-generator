import React, { useEffect, useRef } from "react";
import cytoscape, { Core, ElementDefinition } from "cytoscape";
import { FamilyTree } from "../types/FamilyTree";

interface Props {
    treeData: FamilyTree;
    showLabels: boolean;
    showBirthDates: boolean;
}

const DEFAULT_PHOTO = "../images/ava.jpg";

const getCyStyle = (showLabels: boolean): string => `
  node.person {
    width: 88px;
    height: 112px;
    shape: round-rectangle;
    background-image: data(photo);
    background-fit: cover;
    background-position-x: 50%;
    background-position-y: 50%;
    border-width: 1.5px;
    border-color: #d1d1d6;
    border-radius: 24;
    label: data(label);
    font-size: 13px;
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif;
    font-weight: 500;
    text-valign: bottom;
    text-halign: center;
    color: #1d1d1f;
    text-wrap: wrap;
  }

  edge.edge-parent {
    width: 2.2px;
    line-color: #8e8e93;
    target-arrow-shape: triangle;
    target-arrow-color: #8e8e93;
    label: ${showLabels ? 'data(label)' : ''};
    font-size: 10px;
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
    font-weight: 500;
    text-background-color: rgba(255,255,255,0.8);
    text-background-opacity: 1;
    color: #4a4a4a;
  }

  edge.edge-spouse {
    width: 2px;
    line-style: dashed;
    line-color: #b1b1b6;
    label: ${showLabels ? 'data(label)' : ''};
    font-size: 10px;
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
    font-weight: 500;
    text-background-color: rgba(255,255,255,0.8);
    text-background-opacity: 1;
    color: #4a4a4a;
  }
`;

const FamilyTreeGraph: React.FC<Props> = ({ treeData, showLabels, showBirthDates }) => {
    const ref = useRef<HTMLDivElement>(null);
    const cyRef = useRef<Core | null>(null);

    useEffect(() => {
        if (!ref.current) return;

        const elements: ElementDefinition[] = [
            ...treeData.persons.map(p => ({
                data: {
                    id: p.id,
                    label: showBirthDates ? `${p.fullName}\n${p.birthDate}` : p.fullName,
                    photo: p.photoUrl || DEFAULT_PHOTO
                },
                classes: "person"
            })),
            ...treeData.relations.map((r, i) => ({
                data: {
                    id: `rel-${i}`,
                    source: r.from,
                    target: r.to,
                    label: r.type === "parent" ? "Родитель" : "Муж/Жена"
                },
                classes: r.type === "parent" ? "edge-parent" : "edge-spouse"
            }))
        ];

        const rootIds = treeData.persons
            .filter(p => !treeData.relations.some(r => r.to === p.id && r.type === "parent"))
            .map(p => p.id);

        const cy = cytoscape({
            container: ref.current,
            elements,
            layout: {
                name: "breadthfirst",
                directed: true,
                padding: 50,
                spacingFactor: 1.4,
                roots: rootIds
            },
            style: getCyStyle(showLabels) as any
        });

        cy.fit();
        cy.zoom(cy.zoom() * 0.6);
        cy.center();
        cyRef.current = cy;

        return () => {
            cy.destroy();
            cyRef.current = null;
        };
    }, [treeData]);

    useEffect(() => {
        if (cyRef.current) {
            cyRef.current.nodes().forEach(n => {
                const person = treeData.persons.find(p => p.id === n.id());
                if (person) {
                    const newLabel = showBirthDates ? `${person.fullName}\n${person.birthDate}` : person.fullName;
                    n.data('label', newLabel);
                }
            });
        }
    }, [showBirthDates, treeData]);

    useEffect(() => {
        if (cyRef.current) {
            cyRef.current.style(getCyStyle(showLabels) as any);
        }
    }, [showLabels]);

    return <div ref={ref} className="graph-container" style={{ width: "100%", height: "100%" }} />;
};

export default FamilyTreeGraph;