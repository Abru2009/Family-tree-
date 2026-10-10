import React, { useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Panel,
  useNodes,
  useViewport,
  SelectionMode,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import PersonNode from './PersonNode';
import CoupleNode, { COUPLE_NODE_W, PERSON_NODE_W, NODE_H } from './CoupleNode';
import { useFamily } from '../FamilyContext';
import { useAuth } from '../AuthContext';
import { Search, User, LogOut, Lock, Trash2, Undo, Redo, Calendar, Filter, Download, Move, Square } from 'lucide-react';

const nodeTypes = { person: PersonNode, couple: CoupleNode };

// Helper to find exact top-center X coordinate for a specific member
const getMemberTopCenterX = (memberId, node) => {
  if (node.type === 'couple') {
    if (node.data.husband?.id === memberId) {
      return node.position.x + 110;
    }
    if (node.data.wife?.id === memberId) {
      return node.position.x + 370;
    }
  }
  return node.position.x + 110;
};

// Helper to find bottom-center X coordinate for a parent node
const getParentBottomCenterX = (node) => {
  if (node.type === 'couple') {
    return node.position.x + 240;
  }
  return node.position.x + 110;
};

// ─── Build React Flow nodes + memberToNodeId map ───────────────────────────
const buildNodes = (members, relations, handlers, hiddenHeritages, nodePositions) => {
  const spouseRels = relations.filter(r => r.type === 'spouse');

  const partnerOf = {};
  spouseRels.forEach(r => {
    partnerOf[r.source] = r.target;
    partnerOf[r.target] = r.source;
  });

  const memberToNodeId = {};
  const processedKeys  = new Set();
  const rfNodes        = [];

  members.forEach(member => {
    const partnerId = partnerOf[member.id];
    const partner   = partnerId ? members.find(m => m.id === partnerId) : null;

    if (partner) {
      const key = [member.id, partnerId].sort().join('|');
      if (processedKeys.has(key)) return;
      processedKeys.add(key);

      const husband = member.gender === 'male' ? member : partner;
      const wife    = member.gender === 'male' ? partner : member;
      const nodeId  = `couple_${key}`;

      memberToNodeId[husband.id] = nodeId;
      memberToNodeId[wife.id]    = nodeId;

      const isHidden = (husband.heritage && hiddenHeritages.has(husband.heritage)) || (wife.heritage && hiddenHeritages.has(wife.heritage));

      rfNodes.push({
        id: nodeId,
        type: 'couple',
        position: nodePositions[nodeId] || { x: 0, y: 0 },
        draggable: true,
        selectable: true,
        hidden: isHidden,
        data: { husband, wife, ...handlers },
        style: { background: 'transparent', border: 'none', padding: 0, boxShadow: 'none' },
      });
    } else {
      memberToNodeId[member.id] = member.id;
      const isHidden = member.heritage && hiddenHeritages.has(member.heritage);

      rfNodes.push({
        id: member.id,
        type: 'person',
        position: nodePositions[member.id] || { x: 0, y: 0 },
        draggable: true,
        selectable: true,
        hidden: isHidden,
        data: { ...member, ...handlers },
        style: { background: 'transparent', border: 'none', padding: 0, boxShadow: 'none' },
      });
    }
  });

  return { rfNodes, memberToNodeId };
};

const MIN_GAP = 70;
const ROW_H   = NODE_H + 180; // 320px per generation row

// ─── Layout Algorithm: Bilateral Family Tree ──────────────────────────────
// Separates families into distinct column clusters so lines never cross.
// Family columns are determined by tracing root ancestors (nodes with no parents).
// Each root family gets its own X-axis lane; children/couples are placed between
// their two parent families' lanes.
const layoutNodes = (rfNodes, childEdges, nodePositions) => {
  if (!rfNodes || rfNodes.length === 0) return [];

  const hasSavedPositions = rfNodes.some(n => !!nodePositions[n.id]);

  // ── Always compute genOf (depth) via BFS ──────────────────────────────────
  const genOf = {};
  rfNodes.forEach(n => { genOf[n.id] = 0; });

  try {
    const childTargets = new Set(childEdges.map(e => e.target));
    const roots = rfNodes.map(n => n.id).filter(id => !childTargets.has(id));
    const q = (roots.length > 0 ? roots : [rfNodes[0].id]).map(id => { genOf[id] = 0; return id; });

    let safety = 0;
    while (q.length > 0 && safety < 2000) {
      safety++;
      const cur = q.shift();
      childEdges.filter(e => e.source === cur).forEach(e => {
        const next = Math.max(genOf[e.target] ?? 0, (genOf[cur] ?? 0) + 1);
        if (genOf[e.target] !== next) { genOf[e.target] = next; q.push(e.target); }
      });
    }
  } catch (err) {
    console.error('Layout BFS error:', err);
  }

  rfNodes.forEach(n => { if (genOf[n.id] === undefined) genOf[n.id] = 0; });

  // ── If saved positions exist, just snap Y and derive generation ──────────
  if (hasSavedPositions) {
    return rfNodes.map(n => {
      const saved = nodePositions[n.id];
      const x = saved?.x ?? 0;
      const y = saved ? Math.round(saved.y / ROW_H) * ROW_H : (genOf[n.id] ?? 0) * ROW_H;
      return {
        ...n,
        position: { x, y },
        data: { ...n.data, generation: Math.round(y / ROW_H) + 1 },
      };
    });
  }

  // ── Fresh layout: Bilateral column algorithm ──────────────────────────────
  try {
    const childTargets = new Set(childEdges.map(e => e.target));
    const roots = rfNodes.filter(n => !childTargets.has(n.id));

    // Build parent→children map
    const childrenOf = {};
    const parentOf   = {};
    childEdges.forEach(e => {
      (childrenOf[e.source] = childrenOf[e.source] || []).push(e.target);
      parentOf[e.target] = e.source;
    });

    // Assign each root a separate "family column" index
    const familyOf = {}; // nodeId → familyIndex
    roots.forEach((root, fi) => {
      const stack = [root.id];
      while (stack.length) {
        const id = stack.pop();
        if (familyOf[id] !== undefined) continue;
        familyOf[id] = fi;
        (childrenOf[id] || []).forEach(cid => stack.push(cid));
      }
    });

    // Nodes with two family origins (e.g., children of cross-family couples)
    // get placed at the boundary between the two families
    const familyCount = roots.length || 1;
    const FAMILY_COL_W = 900; // pixels wide per root-family column

    // Group nodes by generation
    const nodesByGen = {};
    rfNodes.forEach(n => {
      const g = genOf[n.id] ?? 0;
      (nodesByGen[g] = nodesByGen[g] || []).push(n);
    });

    const genKeys = Object.keys(nodesByGen).map(Number);
    const maxGen  = genKeys.length ? Math.max(...genKeys) : 0;

    const nodePosMap = {};

    // Place each generation row left-to-right, grouped by family
    for (let g = 0; g <= maxGen; g++) {
      const genNodes = nodesByGen[g] || [];
      if (!genNodes.length) continue;

      // Sort by family index, then by x within family
      genNodes.sort((a, b) => {
        const fa = familyOf[a.id] ?? 0;
        const fb = familyOf[b.id] ?? 0;
        if (fa !== fb) return fa - fb;
        return 0;
      });

      // Layout within each family column
      const familyXCursor = {};
      genNodes.forEach(n => {
        const fi = familyOf[n.id] ?? 0;
        const colStart = fi * FAMILY_COL_W;
        if (familyXCursor[fi] === undefined) familyXCursor[fi] = colStart;

        const w = n.type === 'couple' ? COUPLE_NODE_W : PERSON_NODE_W;
        nodePosMap[n.id] = { x: familyXCursor[fi], y: g * ROW_H };
        familyXCursor[fi] += w + MIN_GAP;
      });
    }

    // Pass 2: center parents over their children
    for (let g = maxGen - 1; g >= 0; g--) {
      const genNodes = nodesByGen[g] || [];
      genNodes.forEach(pn => {
        const kids = (childrenOf[pn.id] || []).map(cid => rfNodes.find(n => n.id === cid)).filter(Boolean);
        if (kids.length > 0) {
          const childXs = kids.map(c => {
            const cw  = c.type === 'couple' ? COUPLE_NODE_W : PERSON_NODE_W;
            const pos = nodePosMap[c.id] || { x: 0 };
            return { left: pos.x, right: pos.x + cw };
          });
          const minCX = Math.min(...childXs.map(c => c.left));
          const maxCX = Math.max(...childXs.map(c => c.right));
          const centerX = (minCX + maxCX) / 2;
          const pw = pn.type === 'couple' ? COUPLE_NODE_W : PERSON_NODE_W;
          if (nodePosMap[pn.id]) nodePosMap[pn.id].x = centerX - pw / 2;
        }
      });

      // Prevent overlaps within the same generation
      const genNodes2 = [...genNodes].sort((a, b) => (nodePosMap[a.id]?.x || 0) - (nodePosMap[b.id]?.x || 0));
      for (let i = 1; i < genNodes2.length; i++) {
        const prev = genNodes2[i - 1];
        const cur  = genNodes2[i];
        const prevW = prev.type === 'couple' ? COUPLE_NODE_W : PERSON_NODE_W;
        const minX  = (nodePosMap[prev.id]?.x || 0) + prevW + MIN_GAP;
        if ((nodePosMap[cur.id]?.x || 0) < minX && nodePosMap[cur.id]) {
          nodePosMap[cur.id].x = minX;
        }
      }
    }

    // Centre entire tree horizontally
    const allX = rfNodes.map(n => nodePosMap[n.id]?.x || 0);
    const minX = Math.min(...allX);
    const maxX = Math.max(...rfNodes.map(n => (nodePosMap[n.id]?.x || 0) + (n.type === 'couple' ? COUPLE_NODE_W : PERSON_NODE_W)));
    const offsetX = -((minX + maxX) / 2);

    return rfNodes.map(n => {
      const x = (nodePosMap[n.id]?.x || 0) + offsetX;
      const y = nodePosMap[n.id]?.y || 0;
      return {
        ...n,
        position: { x, y },
        data: { ...n.data, generation: Math.round(y / ROW_H) + 1 },
      };
    });

  } catch (err) {
    console.error('Layout error:', err);
    return rfNodes.map((n, i) => ({
      ...n,
      position: { x: i * (PERSON_NODE_W + MIN_GAP), y: 0 },
      data: { ...n.data, generation: 1 },
    }));
  }
};

// ─── T-Bar SVG Overlay – Heritage-colored, family-separated lines ──────────
const FamilyConnections = ({ relations, members, heritageColors }) => {
  const nodes = useNodes();
  const { x: vpX, y: vpY, zoom } = useViewport();

  const { lines, SW, labels } = useMemo(() => {
    const childRels = relations.filter(r => r.type !== 'spouse');

    // Build memberNodeOf lookup
    const memberNodeOf = {};
    nodes.forEach(n => {
      if (n.type === 'couple') {
        memberNodeOf[n.data.husband.id] = n;
        memberNodeOf[n.data.wife.id]    = n;
      } else {
        memberNodeOf[n.data.id] = n;
      }
    });

    // Group child-rels by parent node id
    const familyUnits = {};
    childRels.forEach(rel => {
      const parentNode = memberNodeOf[rel.source];
      const childNode  = memberNodeOf[rel.target];
      if (!parentNode || !childNode) return;
      if (parentNode.id === childNode.id) return;
      (familyUnits[parentNode.id] = familyUnits[parentNode.id] || []).push(rel);
    });

    const toScreen = (fx, fy) => ({ x: fx * zoom + vpX, y: fy * zoom + vpY });
    const SW = Math.max(2, 2.5 * zoom);

    const result = [];
    const labelItems = [];

    Object.entries(familyUnits).forEach(([parentNodeId, rels]) => {
      const parentNode = nodes.find(n => n.id === parentNodeId);
      if (!parentNode) return;

      const pCx = getParentBottomCenterX(parentNode);
      const pBy = parentNode.position.y + NODE_H;

      // Heritage color
      let parentHeritage = null;
      if (parentNode.type === 'couple') {
        parentHeritage = parentNode.data.husband?.heritage || parentNode.data.wife?.heritage;
      } else {
        parentHeritage = parentNode.data.heritage;
      }
      const lineColor = (parentHeritage && heritageColors?.[parentHeritage]) || '#45b7ae';

      const childTops = rels.map(rel => {
        const childNode = memberNodeOf[rel.target];
        if (!childNode) return null;
        const cx = getMemberTopCenterX(rel.target, childNode);
        return { cx, ty: childNode.position.y };
      }).filter(Boolean);

      if (!childTops.length) return;

      const childTopY = Math.min(...childTops.map(c => c.ty));

      // Place the horizontal junction bar at 40% of the gap (closer to parent)
      // so lines from different families at the same generation diverge clearly
      const jY = pBy + (childTopY - pBy) * 0.45;

      const allXPoints = [...childTops.map(c => c.cx), pCx];
      const minX = Math.min(...allXPoints);
      const maxX = Math.max(...allXPoints);

      // Vertical stem from parent bottom → junction
      const pB = toScreen(pCx, pBy + 4);
      const jC = toScreen(pCx, jY);
      result.push({ x1: pB.x, y1: pB.y, x2: jC.x, y2: jC.y, stroke: lineColor, width: SW });

      // Horizontal bar across children
      if (minX < maxX) {
        const L = toScreen(minX, jY);
        const R = toScreen(maxX, jY);
        result.push({ x1: L.x, y1: L.y, x2: R.x, y2: R.y, stroke: lineColor, width: SW });
      }

      // Vertical drops to each child
      childTops.forEach(({ cx, ty }) => {
        const Jpt = toScreen(cx, jY);
        const Tpt = toScreen(cx, ty - 4);
        result.push({ x1: Jpt.x, y1: Jpt.y, x2: Tpt.x, y2: Tpt.y, stroke: lineColor, width: SW });
      });

      // Add a small heritage label at the junction point if heritage exists
      if (parentHeritage) {
        const lp = toScreen(pCx + 6, pBy + 12);
        labelItems.push({ x: lp.x, y: lp.y, text: parentHeritage, color: lineColor });
      }
    });

    return { lines: result, SW, labels: labelItems };
  }, [nodes, relations, zoom, vpX, vpY, heritageColors]);

  if (!lines.length) return null;

  return (
    <svg style={{
      position: 'fixed',
      top: 0, left: 0,
      width: '100vw', height: '100vh',
      pointerEvents: 'none',
      zIndex: 5,
    }}>
      <defs>
        {/* Soft glow filter per line */}
        <filter id="lineGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {lines.map((l, i) => (
        <line
          key={i}
          x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
          stroke={l.stroke}
          strokeWidth={l.width}
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#lineGlow)"
          strokeOpacity="0.9"
        />
      ))}

      {/* Heritage name labels on stems */}
      {labels.map((lb, i) => (
        <text
          key={`lbl-${i}`}
          x={lb.x} y={lb.y}
          fill={lb.color}
          fontSize={Math.max(9, 11 * zoom)}
          fontWeight="700"
          fontFamily="system-ui, sans-serif"
          opacity="0.65"
          style={{ userSelect: 'none' }}
        >
          {lb.text}
        </text>
      ))}
    </svg>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────
const FamilyGraph = ({
  onAddRelative,
  onAddBulkChildren,
  onSelectMember,
  onAddRoot,
  onUpdateMember,
  onRemoveConnections,
  onOpenRelationshipModal,
  onOpenCalendar,
  onOpenFilter,
  onOpenExport,
  isRelationshipOpen,
}) => {
  const {
    data,
    deleteMember,
    addRelation,
    clearTree,
    undo,
    redo,
    canUndo,
    canRedo,
    hiddenHeritages,
    heritageColors,
    nodePositions,
    saveNodePosition
  } = useFamily();

  const { currentUser, openAuthModal, signOut } = useAuth();
  const [isLocked, setIsLocked] = React.useState(false);
  const [showInfo, setShowInfo] = React.useState(true);
  const [isDragSelectMode, setIsDragSelectMode] = React.useState(false);

  const handlers = useMemo(() => ({
    onAddRelative,
    onAddBulkChildren,
    onSelectMember,
    onUpdateMember,
    onRemoveConnections,
    onDelete: deleteMember,
  }), [onAddRelative, onAddBulkChildren, onSelectMember, onUpdateMember, onRemoveConnections, deleteMember]);

  const { rfNodes, memberToNodeId } = useMemo(
    () => buildNodes(data.members, data.relations, handlers, hiddenHeritages, nodePositions),
    [data.members, data.relations, handlers, hiddenHeritages, nodePositions]
  );

  const childEdgesForLayout = useMemo(() => {
    const seen = new Set();
    return data.relations
      .filter(r => r.type !== 'spouse')
      .map(r => ({
        source: memberToNodeId[r.source],
        target: memberToNodeId[r.target],
      }))
      .filter(e => {
        if (!e.source || !e.target || e.source === e.target) return false;
        const key = `${e.source}|${e.target}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }, [data.relations, memberToNodeId]);

  const layoutedNodes = useMemo(
    () => layoutNodes(rfNodes, childEdgesForLayout, nodePositions),
    [rfNodes, childEdgesForLayout, nodePositions]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  React.useEffect(() => {
    setNodes(layoutedNodes);
  }, [layoutedNodes, setNodes]);

  const onConnect = React.useCallback((connection) => {
    const { source, target, sourceHandle, targetHandle } = connection;
    const getMemberId = (nodeId, handleId) => {
      const node = nodes.find(n => n.id === nodeId);
      if (!node) return nodeId;
      if (node.type === 'couple') {
        if (handleId === 'top-wife') return node.data.wife.id;
        if (handleId === 'top-husband') return node.data.husband.id;
        return node.data.husband.id;
      }
      return node.data.id;
    };

    const srcMemberId = getMemberId(source, sourceHandle);
    const tgtMemberId = getMemberId(target, targetHandle);

    let relType = 'child';
    if ((sourceHandle === 'left' || sourceHandle === 'right') && (targetHandle === 'left' || targetHandle === 'right')) {
      relType = 'spouse';
    }

    addRelation(srcMemberId, tgtMemberId, relType);
  }, [nodes, addRelation]);

  // Node position drag change handler - saves position on move
  const handleNodesChange = React.useCallback((changes) => {
    onNodesChange(changes);

    changes.forEach(change => {
      if (change.type === 'position' && change.position) {
        saveNodePosition(change.id, change.position);
      }
    });
  }, [onNodesChange, saveNodePosition]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      {data.members.length === 0 ? (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
          <h2 style={{ marginBottom: 16, color: 'var(--text-secondary)' }}>Your family tree is empty</h2>
          <button className="btn" onClick={onAddRoot} style={{ padding: '12px 24px', fontSize: '1.1rem' }}>
            + Start Family Tree
          </button>
        </div>
      ) : (
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          nodesDraggable={!isLocked}
          nodesConnectable={true}
          panOnDrag={!isLocked && !isDragSelectMode}
          selectionOnDrag={isDragSelectMode}
          selectionMode={SelectionMode.Partial}
          panOnScroll={!isLocked}
          zoomOnScroll={!isLocked}
          zoomOnPinch={!isLocked}
          zoomOnDoubleClick={!isLocked}
          fitView
          fitViewOptions={{ padding: 0.25 }}
          minZoom={0.08}
          snapToGrid={true}
          snapGrid={[1, 320]}
          proOptions={{ hideAttribution: true }}
        >
          <FamilyConnections relations={data.relations} members={data.members} heritageColors={heritageColors} />
          <Background color="#45b7ae" gap={28} size={1} variant="dots" style={{ opacity: 0.12 }} />

          {/* Bottom Left Controls: Zoom, Lock, Drag-select, Undo, Redo */}
          <Controls
            position="bottom-left"
            style={{ margin: 16 }}
            showInteractive={true}
            onInteractiveChange={(interactive) => setIsLocked(!interactive)}
          >
            {/* Group Drag Selection Mode Toggle Button */}
            <button
              type="button"
              className="react-flow__controls-button"
              onClick={() => setIsDragSelectMode(!isDragSelectMode)}
              style={{
                background: isDragSelectMode ? 'rgba(69, 183, 174, 0.25)' : 'transparent',
              }}
              title={isDragSelectMode ? "Drag Mode Active: Drag rectangle to group select" : "Click to enable Box Drag Selection"}
            >
              <Square size={13} color="var(--accent-color)" />
            </button>

            {/* Undo Button */}
            <button
              type="button"
              className="react-flow__controls-button"
              onClick={undo}
              disabled={!canUndo}
              style={{ opacity: canUndo ? 1 : 0.35, cursor: canUndo ? 'pointer' : 'not-allowed' }}
              title="Undo last action"
            >
              <Undo size={13} color="var(--accent-color)" />
            </button>

            {/* Redo Button */}
            <button
              type="button"
              className="react-flow__controls-button"
              onClick={redo}
              disabled={!canRedo}
              style={{ opacity: canRedo ? 1 : 0.35, cursor: canRedo ? 'pointer' : 'not-allowed' }}
              title="Redo action"
            >
              <Redo size={13} color="var(--accent-color)" />
            </button>
          </Controls>

          {/* Main Top Left Toolbar */}
          <Panel position="top-left" style={{ margin: 16 }}>
            <div className="glass-panel" style={{
              padding: '14px 18px',
              color: 'var(--text-primary)',
              width: 290,
              boxShadow: '0 4px 16px rgba(69,183,174,0.15)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}>
              {/* Header row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>🌿 Family Tree</span>
                <button
                  onClick={() => setShowInfo(v => !v)}
                  style={{
                    background: 'rgba(69,183,174,0.12)',
                    border: '1px solid rgba(69,183,174,0.3)',
                    borderRadius: 6,
                    color: 'var(--accent-color)',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    padding: '3px 8px',
                  }}
                  title={showInfo ? 'Hide instructions' : 'Show instructions'}
                >
                  {showInfo ? '▲ Hide' : 'ℹ️ Info'}
                </button>
              </div>

              {/* User Account Status */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '6px 10px',
                background: 'rgba(69, 183, 174, 0.08)',
                border: '1px solid rgba(69, 183, 174, 0.25)',
                borderRadius: 8,
                fontSize: '0.76rem',
              }}>
                {currentUser ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-primary)', fontWeight: 600, overflow: 'hidden' }}>
                      <User size={13} color="var(--accent-color)" />
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 130 }}>{currentUser.name}</span>
                    </div>
                    <button
                      onClick={signOut}
                      style={{
                        background: 'none', border: 'none',
                        color: '#f87171', cursor: 'pointer',
                        fontSize: '0.72rem', fontWeight: 700,
                        display: 'flex', alignItems: 'center', gap: 3,
                      }}
                      title="Sign out of your account"
                    >
                      <LogOut size={12} /> Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <span style={{ color: 'var(--text-secondary)' }}>Guest Account</span>
                    <button
                      onClick={openAuthModal}
                      style={{
                        background: 'var(--accent-color)', border: 'none',
                        borderRadius: 6, color: 'white',
                        padding: '2px 8px', fontSize: '0.72rem', fontWeight: 700,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                      }}
                    >
                      <Lock size={11} /> Sign In
                    </button>
                  </>
                )}
              </div>

              {/* Main Action Buttons Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <button
                  onClick={() => onAddRelative('ROOT')}
                  style={{
                    padding: '8px', fontSize: '0.78rem', fontWeight: 600,
                    borderRadius: 8, background: 'var(--accent-color)', color: 'white',
                    border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                  }}
                  title="Add a new standalone person tile"
                >
                  + Add Person
                </button>

                <button
                  onClick={onOpenRelationshipModal}
                  style={{
                    padding: '8px', fontSize: '0.78rem', fontWeight: 600,
                    borderRadius: 8, background: 'rgba(69,183,174,0.12)', color: 'var(--accent-color)',
                    border: '1px solid var(--accent-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                  }}
                  title="Find relationship between two family members"
                >
                  <Search size={13} /> Relationship
                </button>

                <button
                  onClick={onOpenCalendar}
                  style={{
                    padding: '8px', fontSize: '0.78rem', fontWeight: 600,
                    borderRadius: 8, background: 'rgba(69,183,174,0.12)', color: 'var(--accent-color)',
                    border: '1px solid rgba(69,183,174,0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                  }}
                  title="View Family Calendar"
                >
                  <Calendar size={13} /> Calendar
                </button>

                <button
                  onClick={onOpenFilter}
                  style={{
                    padding: '8px', fontSize: '0.78rem', fontWeight: 600,
                    borderRadius: 8, background: 'rgba(69,183,174,0.12)', color: 'var(--accent-color)',
                    border: '1px solid rgba(69,183,174,0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                  }}
                  title="Filter by Family Heritage"
                >
                  <Filter size={13} /> Heritage Filter
                </button>
              </div>

              {/* Secondary Export & Clear Row */}
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={onOpenExport}
                  style={{
                    flex: 1, padding: '6px', fontSize: '0.76rem', fontWeight: 600,
                    borderRadius: 8, background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)',
                    border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                  }}
                  title="Export family tree (PDF, PNG, CSV)"
                >
                  <Download size={13} /> Export
                </button>
              </div>

              {/* Instructions section */}
              {showInfo && (
                <div style={{ paddingTop: 6, borderTop: '1px solid rgba(69,183,174,0.15)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>
                    • Click any person tile to view their profile.<br />
                    • Drag tiles to move; positions are saved.<br />
                    • Click ⏹ in bottom toolbar for drag-grouping.
                  </p>
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to clear all members to start building your big family tree?')) {
                        clearTree();
                      }
                    }}
                    style={{
                      padding: '5px 8px', fontSize: '0.72rem', fontWeight: 600,
                      borderRadius: 6, background: 'rgba(239, 68, 68, 0.1)',
                      color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.25)',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                      marginTop: 2,
                    }}
                    title="Clear current tree to build a new one from scratch"
                  >
                    <Trash2 size={12} /> Clear Board
                  </button>
                </div>
              )}
            </div>
          </Panel>
        </ReactFlow>
      )}
    </div>
  );
};

export default FamilyGraph;
