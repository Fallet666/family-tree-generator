import React, { useEffect, useRef } from "react";
import cytoscape, { Core, ElementDefinition, StylesheetCSS } from "cytoscape";
import { FamilyTree } from "../types/FamilyTree";

interface Props {
  treeData: FamilyTree
  showLabels: boolean;
}

const X_SPACING = 400;
const Y_SPACING = 200;
const SPOUSE_OFFSET = 120;
const DEFAULT_PHOTO = "../images/ava.jpg";


interface CoupleNode {
  id: string;
  members: string[];
  parent: string | null;
  children: string[];
  gen: number;
  width: number;
  xCenter: number;
}

const cssVar = (v: string) =>
    getComputedStyle(document.documentElement).getPropertyValue(v).trim() || undefined;

const palette = {
  surface : cssVar("--apple-surface") || "#ffffff",
  border  : cssVar("--apple-border")  || "#d1d1d6",
  text    : cssVar("--apple-text")    || "#1d1d1f",
  accent  : cssVar("--apple-accent")  || "#0a84ff"
};

const getCyStyle = (showLabels: boolean): string =>
  `node.person {
    width: 88px;
    height: 112px;
    shape: round-rectangle;

    background-color: ${palette.surface};
    background-image: data(photo);
    background-fit: cover;
    background-position-x: 50%;
    background-position-y: 50%;

    border-width: 1.5px;
    border-color: ${palette.border};
    border-opacity: 1;
    border-radius: 24;

    shadow-blur: 14;
    shadow-color: rgba(0,0,0,0.08);
    shadow-offset-x: 0;
    shadow-offset-y: 4;

    label: data(label);
    font-size: 13px;
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif;
    font-weight: 500;
    text-wrap: wrap;
    text-max-width: 76;
    text-valign: bottom;
    text-halign: center;
    text-outline-width: 1;
    text-outline-color: rgba(255,255,255,0.8);
    color: ${palette.text};

    transition-property: background-color, border-color, shadow-blur;
    transition-duration: 300ms;
    transition-timing-function: ease-in-out;
  }

  node.person:selected {
    border-color: ${palette.accent};
    border-width: 2px;
    shadow-blur: 18;
    shadow-color: rgba(10,132,255,0.35);
    background-color: linear-gradient(145deg, #f0f4ff, #ffffff);
  }

  edge.edge-parent {
    width: 2.2px;
    line-color: #8e8e93;
    line-style: solid;
    target-arrow-shape: triangle;
    target-arrow-color: #8e8e93;

    label: ${showLabels ? 'data(label)' : ''};
    font-size: 10px;
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
    font-weight: 500;

    text-margin-y: -10;
    text-background-color: rgba(255,255,255,0.8);
    text-background-opacity: 1;
    text-border-opacity: 0.2;
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
    text-border-opacity: 0.2;
    color: #4a4a4a;
  }

  node.person:active {
    shadow-blur: 24;
    shadow-color: rgba(0,0,0,0.15);
    transition-duration: 150ms;
  }
`;


const FamilyTreeGraph: React.FC<Props> = ({ treeData, showLabels }) => {
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
        position: { x: xRaw - offsetX, y },
        data: {
        id: p.id,
        label: `${p.fullName}\n${p.birthDate}`,
         photo: p.photoUrl || DEFAULT_PHOTO    // ← понадобится в cyStyle
    },
   classes: "person"
      });
    });
    treeData.relations.forEach(r => {
      elements.push({
        data: { source: r.from, target: r.to, label: r.type === 'parent' ? 'Родитель' : 'Муж/Жена' },
        classes: r.type === 'parent' ? 'edge-parent' : 'edge-spouse'
      });
    });

    // @ts-ignore
    const cy: Core = cytoscape({
      container: ref.current!,
      elements,
      layout: { name: 'preset', padding: 50 },
      style: getCyStyle(showLabels) as any
    });
    cy.fit();
  }, [treeData, showLabels]);

  return <div ref={ref} className="graph-container" />;
};

export default FamilyTreeGraph;