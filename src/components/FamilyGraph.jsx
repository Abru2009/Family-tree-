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

// ─── Layout Algorithm ──────────────────────────────────────────────────
const layoutNodes = (rfNodes, childEdges, nodePositions) => {
  if (!rfNodes || rfNodes.length === 0) return [];

  const nodePosMap = {};
  const genOf      = {};
  rfNodes.forEach((n, i) => {
    nodePosMap[n.id] = nodePositions[n.id] ? { ...nodePositions[n.id] } : { x: i * (PERSON_NODE_W + MIN_GAP), y: 0 };
    genOf[n.id]      = 0;
  });

  // If positions are saved in localStorage, respect saved positions
  const hasSavedPositions = rfNodes.some(n => !!nodePositions[n.id]);

  try {
    const childTargets = new Set(childEdges.map(e => e.target));
    const roots        = rfNodes.map(n => n.id).filter(id => !childTargets.has(id));
    const q     = (roots.length > 0 ? roots : [rfNodes[0].id]).map(id => { genOf[id] = 0; return id; });

    let safety = 0;
    while (q.length > 0 && safety < 2000) {
      safety++;
      const cur = q.shift();
      childEdges.filter(e => e.source === cur).forEach(e => {
        const next = Math.max(genOf[e.target] ?? 0, (genOf[cur] ?? 0) + 1);
        if (genOf[e.target] !== next) { genOf[e.target] = next; q.push(e.target); }
      });
    }

    rfNodes.forEach(n => {
      if (genOf[n.id] === undefined) genOf[n.id] = 0;
    });

    if (!hasSavedPositions) {
      const parentOf = {};
      childEdges.forEach(e => { parentOf[e.target] = e.source; });

      const getBirthDate = (n) => {
        if (n.type === 'couple') return n.data.husband?.birthDate || n.data.wife?.birthDate || '';
        return n.data.birthDate || '';
      };

      const nodesByGen = {};
      rfNodes.forEach(n => {
        const g = genOf[n.id] ?? 0;
        (nodesByGen[g] = nodesByGen[g] || []).push(n);
      });

      const genKeys = Object.keys(nodesByGen).map(Number);
      const maxGen  = genKeys.length ? Math.max(...genKeys) : 0;

      for (let g = 0; g <= maxGen; g++) {
        const genNodes = nodesByGen[g] || [];
        if (!genNodes.length) continue;

        genNodes.sort((a, b) => {
          const pA = parentOf[a.id] || '';
          const pB = parentOf[b.id] || '';
          if (pA !== pB) return pA.localeCompare(pB);
          const bA = getBirthDate(a);
          const bB = getBirthDate(b);
          if (!bA && !bB) return 0;
          if (!bA) return 1;
          if (!bB) return -1;
          return bA < bB ? -1 : 1;
        });

        let currentX = 0;
        const yPos   = g * (NODE_H + 180);

        genNodes.forEach(n => {
          const w = n.type === 'couple' ? COUPLE_NODE_W : PERSON_NODE_W;
          nodePosMap[n.id] = { x: currentX, y: yPos };
          currentX += w + MIN_GAP;
        });
      }

      for (let g = maxGen - 1; g >= 0; g--) {
        const genNodes = nodesByGen[g] || [];
        genNodes.forEach(pn => {
          const children = rfNodes.filter(n => parentOf[n.id] === pn.id);
          if (children.length > 0) {
            const childXs = children.map(c => {
              const cw = c.type === 'couple' ? COUPLE_NODE_W : PERSON_NODE_W;
              const pos = nodePosMap[c.id] || { x: 0 };
              return { left: pos.x, right: pos.x + cw };
            });
            const minChildX     = Math.min(...childXs.map(c => c.left));
            const maxChildRight = Math.max(...childXs.map(c => c.right));
            const childrenCenterX = (minChildX + maxChildRight) / 2;

            const pw = pn.type === 'couple' ? COUPLE_NODE_W : PERSON_NODE_W;
            if (nodePosMap[pn.id]) {
              nodePosMap[pn.id].x = childrenCenterX - pw / 2;
            }
          }
        });

        genNodes.sort((a, b) => (nodePosMap[a.id]?.x || 0) - (nodePosMap[b.id]?.x || 0));
        for (let i = 1; i < genNodes.length; i++) {
          const prev  = genNodes[i - 1];
          const cur   = genNodes[i];
          const prevW = prev.type === 'couple' ? COUPLE_NODE_W : PERSON_NODE_W;
          const prevX = nodePosMap[prev.id]?.x || 0;
          const curX  = nodePosMap[cur.id]?.x || 0;
          const minX  = prevX + prevW + MIN_GAP;
          if (curX < minX && nodePosMap[cur.id]) {
            nodePosMap[cur.id].x = minX;
          }
        }
      }
    }
  } catch (err) {
    console.error('Layout error:', err);
  }

  const laid = rfNodes.map(n => {
    const gen = (genOf[n.id] ?? 0) + 1;
    return {
      ...n,
      position: {
        x: nodePosMap[n.id]?.x || 0,
        y: nodePosMap[n.id]?.y || 0,
      },
      data: {
        ...n.data,
        generation: gen,
      },
    };
  });

  if (!hasSavedPositions) {
    const allX = laid.map(n => n.position.x);
    const minX = Math.min(...allX);
    const maxX = Math.max(...allX.map((x, i) => {
      const n = laid[i];
      return x + (n.type === 'couple' ? COUPLE_NODE_W : PERSON_NODE_W);
    }));
    const offsetX = -((minX + maxX) / 2);
    laid.forEach(n => { n.position.x += offsetX; });
  }

  return laid;
};

// ─── T-Bar SVG Overlay with Heritage Color Coding ──────────────────────────
const FamilyConnections = ({ relations, members, heritageColors }) => {
  const nodes = useNodes();
  const { x: vpX, y: vpY, zoom } = useViewport();

  const lines = useMemo(() => {
    const childRels = relations.filter(r => r.type !== 'spouse');

    const memberNodeOf = {};
    nodes.forEach(n => {
      if (n.type === 'couple') {
        memberNodeOf[n.data.husband.id] = n;
        memberNodeOf[n.data.wife.id]    = n;
      } else {
        memberNodeOf[n.data.id] = n;
      }
    });

    const familyUnits = {};
    childRels.forEach(rel => {
      const parentNode = memberNodeOf[rel.source];
      const childNode  = memberNodeOf[rel.target];
      if (!parentNode || !childNode) return;
      if (parentNode.id === childNode.id) return;
      (familyUnits[parentNode.id] = familyUnits[parentNode.id] || []).push(rel);
    });

    const toScreen = (fx, fy) => ({ x: fx * zoom + vpX, y: fy * zoom + vpY });
    const SW     = Math.max(2, 2.5 * zoom);

    const result = [];

    Object.entries(familyUnits).forEach(([parentNodeId, rels]) => {
      const parentNode = nodes.find(n => n.id === parentNodeId);
      if (!parentNode) return;

      const pCx = getParentBottomCenterX(parentNode);
      const pBy = parentNode.position.y + NODE_H;

      // Determine heritage color for this family unit
      let parentHeritage = null;
      if (parentNode.type === 'couple') {
        parentHeritage = parentNode.data.husband?.heritage || parentNode.data.wife?.heritage;
      } else {
        parentHeritage = parentNode.data.heritage;
      }
      const lineColor = (parentHeritage && heritageColors?.[parentHeritage]) || '#45b7ae';

      const childTops = rels.map(rel => {
        const childMemberId = rel.target;
        const childNode     = memberNodeOf[childMemberId];
        if (!childNode) return null;
        const cx = getMemberTopCenterX(childMemberId, childNode);
        return { cx, ty: childNode.position.y };
      }).filter(Boolean);

      if (!childTops.length) return;

      const childTopY = Math.min(...childTops.map(c => c.ty));
      const jY        = (pBy + childTopY) / 2;

      const allXPoints = [...childTops.map(c => c.cx), pCx];
      const minX = Math.min(...allXPoints);
      const maxX = Math.max(...allXPoints);

      const pB = toScreen(pCx, pBy + 4);
      const jC = toScreen(pCx, jY);
      result.push({ x1: pB.x, y1: pB.y, x2: jC.x, y2: jC.y, stroke: lineColor });

      if (minX < maxX) {
        const L = toScreen(minX, jY);
        const R = toScreen(maxX, jY);
        result.push({ x1: L.x, y1: L.y, x2: R.x, y2: R.y, stroke: lineColor });
      }

      childTops.forEach(({ cx, ty }) => {
        const Jpt = toScreen(cx, jY);
        const Tpt = toScreen(cx, ty - 4);
        result.push({ x1: Jpt.x, y1: Jpt.y, x2: Tpt.x, y2: Tpt.y, stroke: lineColor });
      });
    });

    return { lines: result, SW };
  }, [nodes, relations, zoom, vpX, vpY, heritageColors]);

  if (!lines.lines.length) return null;

  return (
    <svg style={{
      position: 'absolute',
      top: 0, left: 0,
      width: '100%', height: '100%',
      pointerEvents: 'none',
      zIndex: 5,
    }}>
      {lines.lines.map((l, i) => (
        <line
          key={i}
          x1={l.x1}
          y1={l.y1}
          x2={l.x2}
          y2={l.y2}
          stroke={l.stroke}
          strokeWidth={lines.SW}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
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
              <Square size={13} color={isDragSelectMode ? 'var(--accent-color)' : 'var(--text-primary)'} />
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
              <Undo size={13} />
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
              <Redo size={13} />
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
