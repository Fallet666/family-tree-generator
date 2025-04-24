import React, { useEffect, useRef } from "react";
import cytoscape, { Core, ElementDefinition } from "cytoscape";
import { FamilyTree } from "../types/FamilyTree";
import "../styles/graph.css";

interface Props { treeData: FamilyTree }

const X_SPACING = 400;
const Y_SPACING = 200;
const SPOUSE_OFFSET = 120;
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

    const couples = new Map<string, CoupleNode>();
    treeData.persons.forEach(p => {
      couples.set(p.id, { id: p.id, members: [p.id], parent: null, children: [], gen: 0, width: 0, xCenter: 0 });
    });
    treeData.relations.filter(r => r.type === 'spouse').forEach(r => {
      const [a, b] = [r.from, r.to].sort();
      const cid = `pair-${a}-${b}`;
      if (!couples.has(cid)) {
        couples.delete(a);
        couples.delete(b);
        couples.set(cid, { id: cid, members: [a, b], parent: null, children: [], gen: 0, width: 0, xCenter: 0 });
      }
    });
    const findCouple = (pid: string) => {
      for (const [cid, c] of couples) if (c.members.includes(pid)) return cid;
      return pid;
    };
    treeData.relations.filter(r => r.type === 'parent').forEach(r => {
      const pc = findCouple(r.from);
      const cc = findCouple(r.to);
      if (pc && cc && pc !== cc) {
        if (!couples.get(pc)!.children.includes(cc)) {
          couples.get(pc)!.children.push(cc);
        }
        if (couples.get(cc)!.parent === null) couples.get(cc)!.parent = pc;
      }
    });

    const roots = Array.from(couples.values()).filter(c => c.parent === null);
    const queue = roots.map(c => c.id);
    roots.forEach(c => { couples.get(c.id)!.gen = 0; });
    while (queue.length) {
      const cid = queue.shift()!;
      const c = couples.get(cid)!;
      c.children.forEach(ch => {
        const child = couples.get(ch)!;
        child.gen = c.gen + 1;
        queue.push(ch);
      });
    }

    const dfsWidth = (cid: string): number => {
      const c = couples.get(cid)!;
      if (!c.children.length) {
        c.width = c.members.length;
      } else {
        c.width = c.children.reduce((sum, ch) => sum + dfsWidth(ch), 0);
        c.width = Math.max(c.width, c.members.length);
      }
      return c.width;
    };
    roots.forEach(r => dfsWidth(r.id));

    let cursor = 0;
    const childToParents = new Map<string, string[]>();
    for (const [cid, couple] of couples) {
      couple.children.forEach(ch => {
        if (!childToParents.has(ch)) childToParents.set(ch, []);
        childToParents.get(ch)!.push(cid);
      });
    }

    const assignX = (cid: string) => {
      const c = couples.get(cid)!;
      if (!c.children.length) {
        c.xCenter = cursor + (c.width * X_SPACING) / 2;
        cursor += c.width * X_SPACING;
      } else {
        c.children.forEach(ch => assignX(ch));
        const childXs = c.children.map(ch => couples.get(ch)!.xCenter);
        const myXs = childToParents.get(cid)?.map(pid => couples.get(pid)!.xCenter) || [];
        const avgXs = [...childXs, ...myXs].filter(Boolean);
        if (avgXs.length > 0) {
          c.xCenter = avgXs.reduce((a, b) => a + b, 0) / avgXs.length;
        }
      }
    };
    roots.forEach(r => assignX(r.id));

    const primary = findCouple(treeData.persons[0].id);
    const offsetX = couples.get(primary)!.xCenter;

    const elements: ElementDefinition[] = [];
    treeData.persons.forEach(p => {
      const cid = findCouple(p.id);
      const c = couples.get(cid)!;
      const idx = c.members.indexOf(p.id);
      const xRaw = c.xCenter + (idx * 2 - (c.members.length - 1)) * SPOUSE_OFFSET;
      const y = c.gen * Y_SPACING;
      elements.push({
        data: { id: p.id, label: p.fullName + "\n" + p.birthDate },
        position: { x: xRaw - offsetX, y },
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