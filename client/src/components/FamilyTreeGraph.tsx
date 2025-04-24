import React, { useEffect, useRef } from "react";
import cytoscape, { Core, ElementDefinition } from "cytoscape";
import { FamilyTree } from "../types/FamilyTree";
import "../styles/graph.css";

interface Props { treeData: FamilyTree }

const X_SPACING = 180;
const Y_SPACING = 200;
const SPOUSE_OFFSET = 100;
const DEFAULT_PHOTO =
    "https://yt3.googleusercontent.com/ytc/AIdro_k8ktKuQmVRXjH3RzMekX2wCP6VoKl3qiVYk7TZGmTl850=s900-c-k-c0x00ffffff-no-rj";

interface CoupleNode {
  id: string;
  members: string[];
  parent: string | null;
  children: string[];
  gen: number;
  width: number;
  xCenter: number;
}

const FamilyTreeGraph: React.FC<Props> = ({ treeData }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    // 1. Build couples map
    const couples = new Map<string, CoupleNode>();
    // initialize each person as single couple
    treeData.persons.forEach(p => {
      couples.set(p.id, { id: p.id, members: [p.id], parent: null, children: [], gen: 0, width: 0, xCenter: 0 });
    });
    // combine spouses
    treeData.relations.filter(r => r.type === 'spouse').forEach(r => {
      const [a, b] = [r.from, r.to].sort();
      const cid = `pair-${a}-${b}`;
      if (!couples.has(cid)) {
        couples.delete(a);
        couples.delete(b);
        couples.set(cid, { id: cid, members: [a, b], parent: null, children: [], gen: 0, width: 0, xCenter: 0 });
      }
    });

    // helper to find couple by person id
    const findCouple = (pid: string) => {
      for (const [cid, c] of couples) if (c.members.includes(pid)) return cid;
      return pid;
    };

    // 2. Link parent-child at couple level
    treeData.relations.filter(r => r.type === 'parent').forEach(r => {
      const pc = findCouple(r.from);
      const cc = findCouple(r.to);
      if (pc && cc && pc !== cc) {
        const parentC = couples.get(pc)!;
        const childC = couples.get(cc)!;
        parentC.children.push(cc);
        childC.parent = pc;
      }
    });

    // 3. Assign generation to couples via BFS
    const roots = Array.from(couples.values()).filter(c => c.parent === null);
    const queue: string[] = roots.map(c => c.id);
    queue.forEach(cid => { couples.get(cid)!.gen = 0 });
    while (queue.length) {
      const cid = queue.shift()!;
      const cnode = couples.get(cid)!;
      cnode.children.forEach(cc => {
        const child = couples.get(cc)!;
        child.gen = cnode.gen + 1;
        queue.push(cc);
      });
    }

    // 4. Compute subtree widths via DFS
    const dfsWidth = (cid: string): number => {
      const cnode = couples.get(cid)!;
      if (!cnode.children.length) {
        cnode.width = cnode.members.length;
      } else {
        cnode.width = cnode.children.reduce((sum, cc) => sum + dfsWidth(cc), 0);
        // ensure width at least members count
        cnode.width = Math.max(cnode.width, cnode.members.length);
      }
      return cnode.width;
    };
    roots.forEach(r => dfsWidth(r.id));

    // 5. Compute xCenter via DFS
    let cursor = 0;
    const assignX = (cid: string) => {
      const cnode = couples.get(cid)!;
      if (!cnode.children.length) {
        cnode.xCenter = cursor + (cnode.width * X_SPACING) / 2;
        cursor += cnode.width * X_SPACING;
      } else {
        cnode.children.forEach(cc => assignX(cc));
        const xs = cnode.children.map(cc => couples.get(cc)!.xCenter);
        cnode.xCenter = xs.reduce((a, b) => a + b, 0) / xs.length;
      }
    };
    roots.forEach(r => assignX(r.id));

    // 6. Prepare elements
    const elements: ElementDefinition[] = [];
    treeData.persons.forEach(p => {
      const cid = findCouple(p.id);
      const cnode = couples.get(cid)!;
      const gen = cnode.gen;
      const idx = cnode.members.indexOf(p.id);
      const x = cnode.xCenter + (idx * 2 - (cnode.members.length - 1)) * SPOUSE_OFFSET;
      const y = gen * Y_SPACING;
      elements.push({
        data: { id: p.id, label: p.fullName + '\n' + p.birthDate },
        position: { x, y },
        style: {
          'background-image': p.photoUrl || DEFAULT_PHOTO,
          'background-fit': 'cover',
          'background-opacity': 1,
          'border-width': 3,
          'border-color': '#444',
          shape: 'roundrectangle',
          width: 100,
          height: 120,
          'font-size': 10,
          'text-wrap': 'wrap',
          'text-max-width': 90,
          'text-valign': 'bottom',
          'text-halign': 'center',
          color: '#000',
          'background-color': '#fff'
        }
      });
    });
    treeData.relations.forEach(r => {
      elements.push({
        data: { source: r.from, target: r.to, label: r.type === 'parent' ? 'Родитель' : 'Муж/Жена' },
        classes: r.type === 'parent' ? 'edge-parent' : 'edge-spouse'
      });
    });

    // 7. Init cytoscape
    const cy: Core = cytoscape({
      container: ref.current!,
      elements,
      layout: { name: 'preset', padding: 50 },
      style: [
        { selector: 'node', style: { label: 'data(label)' } },
        { selector: '.edge-parent', style: {
            width: 2,
            'line-color': '#888',
            'target-arrow-shape': 'triangle',
            'target-arrow-color': '#888',
            label: 'data(label)',
            'font-size': 10,
            'text-margin-y': -10,
            'text-background-opacity': 1,
            'text-background-color': '#fff'
          }},
        { selector: '.edge-spouse', style: {
            width: 2,
            'line-style': 'dashed',
            'line-color': '#aaa',
            'target-arrow-shape': 'none',
            label: 'data(label)',
            'font-size': 10,
            'text-background-opacity': 1,
            'text-background-color': '#fff'
          }}
      ]
    });
    cy.fit();
  }, [treeData]);

  return <div ref={ref} className="graph-container" />;
};

export default FamilyTreeGraph;